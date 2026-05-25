import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock(
  "../../../handlers/list-xero-payroll-employee-leave-types.handler.js",
  () => ({
    listXeroPayrollEmployeeLeaveTypes: vi.fn(),
  }),
);

import ListPayrollEmployeeLeaveTypesTool from "../list-payroll-employee-leave-types.tool.js";
import { listXeroPayrollEmployeeLeaveTypes } from "../../../handlers/list-xero-payroll-employee-leave-types.handler.js";

const handlerMock = vi.mocked(listXeroPayrollEmployeeLeaveTypes);

async function invokeTool(employeeId = "emp-1") {
  const tool = ListPayrollEmployeeLeaveTypesTool();
  return tool.handler({ employeeId }, {} as never);
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

describe("list-payroll-employee-leave-types tool", () => {
  it("renders error text when handler returns isError", async () => {
    handlerMock.mockResolvedValue({
      result: null,
      isError: true,
      error: "Not supported for AU orgs",
    });

    const result = await invokeTool();

    expect(bodyTextOf(result, 0)).toContain("Error listing employee leave types");
    expect(bodyTextOf(result, 0)).toContain("Not supported for AU orgs");
  });

  it("labels accrual as 'Units Accrued Annually' (not 'Hours')", async () => {
    handlerMock.mockResolvedValue({
      result: [{ leaveTypeID: "lt-1", unitsAccruedAnnually: 160 }],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Units Accrued Annually: 160");
    expect(body).not.toContain("Hours Accrued Annually");
  });

  it("renders typeOfUnitsToAccrue as 'Type of Units' when present", async () => {
    handlerMock.mockResolvedValue({
      result: [
        {
          leaveTypeID: "lt-1",
          typeOfUnitsToAccrue: "Days",
          unitsAccruedAnnually: 20,
        },
      ],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Type of Units: Days");
    expect(body).toContain("Units Accrued Annually: 20");
  });

  it("renders Leave Type ID exactly once", async () => {
    handlerMock.mockResolvedValue({
      result: [{ leaveTypeID: "lt-1", unitsAccruedAnnually: 160 }],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body.match(/Leave Type ID:/g)?.length).toBe(1);
  });

  it("omits null/undefined fields from rendered output", async () => {
    handlerMock.mockResolvedValue({
      result: [{ leaveTypeID: "lt-1" }],
      isError: false,
      error: null,
    });

    const body = bodyTextOf(await invokeTool(), 1);

    expect(body).toContain("Leave Type ID: lt-1");
    expect(body).not.toContain("Units Accrued Annually");
    expect(body).not.toContain("Maximum To Accrue");
    expect(body).not.toContain("Opening Balance");
    expect(body).not.toContain("Rate Accrued Hourly");
    expect(body).not.toContain("Accrual Date");
    expect(body).not.toContain("Type of Units");
  });
});
