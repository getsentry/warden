// Source excerpt from getsentry/sentry static/app/views/insights/pages/conversations/utils/conversationMessages.ts@8e5104733bdb0d03d2f7148da5869a651c4f23fd.
// Unrelated context omitted; captured around the fix diff for ce32ccf8e820cf565c91ba9760c36df87dda353f.

        msg => msg.role === 'assistant' && (msg.content || msg.parts)
      );
      if (assistantMessage) {
        const content = extractTextFromMessage(assistantMessage);
        if (content) {
          return content;
        }
      }
    } catch {
      // Invalid JSON, fall through to legacy attributes
    }
  }

  const responseText = getStringAttr(node, SpanFields.GEN_AI_RESPONSE_TEXT);
  if (responseText) {
    return responseText;
  }

  return getStringAttr(node, SpanFields.GEN_AI_RESPONSE_OBJECT) ?? null;
}

export function getNodeTimestamp(node: AITraceSpanNode): number {
  return 'start_timestamp' in node.value ? node.value.start_timestamp : 0;
}

function getGenAiOpType(node: AITraceSpanNode): string | undefined {
  return getStringAttr(node, SpanFields.GEN_AI_OPERATION_TYPE);
}

export function extractTextFromMessage(msg: RequestMessage): string | null {
  if (Array.isArray(msg.parts)) {
    const textParts = msg.parts
      .filter(p => p.type === 'text')
      .map(p => p.content || p.text)
      .filter(Boolean);
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  if (typeof msg.content === 'string') {
    return msg.content;
  }

  if (Array.isArray(msg.content)) {
    return msg.content[0]?.text ?? null;
  }

  return null;
}
