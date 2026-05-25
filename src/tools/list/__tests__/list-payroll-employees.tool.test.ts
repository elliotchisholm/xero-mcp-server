import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock(
  "../../../handlers/list-xero-payroll-employees.handler.js",
  () => ({
    listXeroPayrollEmployees: vi.fn(),
  }),
);

import ListPayrollEmployeesTool from "../list-payroll-employees.tool.js";
import { listXeroPayrollEmployees } from "../../../handlers/list-xero-payroll-employees.handler.js";

const handlerMock = vi.mocked(listXeroPayrollEmployees);

type HandlerResult = Awaited<ReturnType<typeof listXeroPayrollEmployees>>;
const asResult = (r: unknown) => r as HandlerResult;

async function invokeTool() {
  const tool = ListPayrollEmployeesTool();
  return tool.handler({}, {} as never);
}

function bodyTextOf(
  result: Awaited<ReturnType<typeof invokeTool>>,
  index: number,
): string {
  const item = result.content[index];
  if (item.type !== "text") throw new Error("expected text content");
  return item.text;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("list-payroll-employees tool", () => {
  it("renders error text when handler returns isError", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: null,
      isError: true,
      error: "Authentication failed",
    }));

    const body = bodyTextOf(await invokeTool(), 0);

    expect(body).toContain("Error listing payroll employees");
    expect(body).toContain("Authentication failed");
  });

  it("renders all employee fields when populated", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [
        {
          employeeID: "emp-1",
          email: "alice@example.com",
          gender: "F",
          phoneNumber: "555-1234",
          startDate: "2024-01-01",
          engagementType: "Permanent",
          title: "Engineer",
          firstName: "Alice",
          lastName: "Smith",
          updatedDateUTC: "2024-06-01",
        },
      ],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Employee: emp-1");
    expect(body).toContain("Email: alice@example.com");
    expect(body).toContain("Engagement Type: Permanent");
    expect(body).toContain("First Name: Alice");
    expect(body).toContain("Last Name: Smith");
  });

  it("renders 'No email' fallback when email is missing", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [{ employeeID: "emp-1", engagementType: "Permanent" }],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("No email");
  });

  it("renders 'No status' fallback when engagementType is missing", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [{ employeeID: "emp-1", email: "a@b.com" }],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("No status");
  });

  it("omits truly optional fields when undefined", async () => {
    handlerMock.mockResolvedValue(asResult({
      result: [{ employeeID: "emp-1" }],
      isError: false,
      error: null,
    }));

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).not.toContain("Gender:");
    expect(body).not.toContain("Phone:");
    expect(body).not.toContain("Start Date:");
    expect(body).not.toContain("Title:");
    expect(body).not.toContain("Last Updated:");
  });
});
