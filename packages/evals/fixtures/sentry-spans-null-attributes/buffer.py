# Source excerpt from getsentry/sentry src/sentry/spans/buffer.py@9f90bf49b54a25725005b0ca5ba822ce9483da87.
# Unrelated context omitted; captured around the fix diff for 8a40a128b581e8d311869b6574598347e097b581.

        flusher_logger_enabled = options.get("spans.buffer.flusher-cumulative-logger-enabled")
        max_segments_per_shard = math.ceil(max_flush_segments / shard_factor)

        ids_start = time.monotonic()
        with metrics.timer("spans.buffer.flush_segments.load_segment_ids"):
            with self.client.pipeline(transaction=False) as p:
                for shard in self.assigned_shards:
                    key = self._get_queue_key(shard)
                    p.zrangebyscore(key, 0, cutoff, start=0, num=max_segments_per_shard)
                    queue_keys.append(key)

                result = p.execute()
        load_ids_latency_ms = int((time.monotonic() - ids_start) * 1000)

        segment_keys: list[tuple[int, QueueKey, SegmentKey]] = []
        for shard, queue_key, keys in zip(self.assigned_shards, queue_keys, result):
            for segment_key in keys:
                segment_keys.append((shard, queue_key, segment_key))

        data_start = time.monotonic()
        with metrics.timer("spans.buffer.flush_segments.load_segment_data"):
            segments, oob_keys_by_segment = self._load_segment_data([k for _, _, k in segment_keys])
        load_data_latency_ms = int((time.monotonic() - data_start) * 1000)

        return_segments = {}
        num_has_root_spans = 0
        any_shard_at_limit = False
        flusher_log_entries: list[FlusherLogEntry] = []

        for shard, queue_key, segment_key in segment_keys:
            segment_span_id = segment_key_to_span_id(segment_key).decode("ascii")
            segment = segments.get(segment_key, [])

            if len(segment) >= max_segments_per_shard:
                any_shard_at_limit = True

            output_spans = []
            has_root_span = False
            metrics.timing("spans.buffer.flush_segments.num_spans_per_segment", len(segment))
            # This incr metric is needed to get a rate overall.
            metrics.incr("spans.buffer.flush_segments.count_spans_per_segment", amount=len(segment))
            for payload in segment:
                span = orjson.loads(payload)

                if not attribute_value(span, "sentry.segment.id"):
                    span.setdefault("attributes", {})["sentry.segment.id"] = {
                        "type": "string",
                        "value": segment_span_id,
                    }

                is_segment = segment_span_id == span["span_id"]
                span["is_segment"] = is_segment
                if is_segment:
                    has_root_span = True

                output_spans.append(OutputSpan(payload=span))

            metrics.incr(
                "spans.buffer.flush_segments.num_segments_per_shard", tags={"shard_i": shard}
            )
            return_segments[segment_key] = FlushedSegment(
                queue_key=queue_key,
                spans=output_spans,
                oob_keys=oob_keys_by_segment.get(segment_key, []),
            )
            num_has_root_spans += int(has_root_span)

            if flusher_logger_enabled and segment:
                project_id, trace_id, _ = parse_segment_key(segment_key)
                project_and_trace = f"{project_id.decode('ascii')}:{trace_id.decode('ascii')}"
                flusher_log_entries.append(
                    FlusherLogEntry(
                        project_and_trace,
                        len(segment),
                        sum(len(s) for s in segment),
                    )
                )

        if flusher_logger_enabled and flusher_log_entries:
            self._flusher_logger.log(
                flusher_log_entries,
                load_ids_latency_ms,
                load_data_latency_ms,
                self._last_decompress_latency_ms,
            )

        metrics.timing("spans.buffer.flush_segments.num_segments", len(return_segments))
        metrics.timing("spans.buffer.flush_segments.has_root_span", num_has_root_spans)

        self.any_shard_at_limit = any_shard_at_limit
        return return_segments