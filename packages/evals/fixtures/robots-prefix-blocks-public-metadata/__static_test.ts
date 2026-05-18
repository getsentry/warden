import { describe, expect, it } from "vitest";
import { app } from "../server.js";

describe("static routes", () => {
  it("serves the public MCP discovery manifest", async () => {
    const response = await app.request("/mcp.json");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      name: "Example MCP",
      transport: "streamable-http",
    });
  });

  it("serves robots.txt", async () => {
    const response = await app.request("/robots.txt");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe([
      "User-agent: *",
      "Disallow: /admin",
      "Disallow: /mcp",
      "",
    ].join("\n"));
  });
});
