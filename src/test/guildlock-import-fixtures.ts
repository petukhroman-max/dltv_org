import { Workbook } from "exceljs";

export type GuildlockFixtureVariant =
  | "valid"
  | "warnings"
  | "conflicts"
  | "invalid"
  | "duplicate";

export async function buildGuildlockWorkbookFixture(
  variant: GuildlockFixtureVariant = "valid",
): Promise<Buffer> {
  const workbook = new Workbook();
  const main = workbook.addWorksheet("Main Info");
  main.addRows([
    ["Event Name", "Example Guildlock"],
    ["Start Date", "2026-08-01"],
    ["End Date", "2026-08-03"],
  ]);

  const groups = workbook.addWorksheet("Qualifiers Day 1");
  for (const [column, group] of [
    [2, "Group A"],
    [7, "Group B"],
    [12, "Group C"],
    [17, "Group D"],
  ] as const) {
    groups.mergeCells(2, column, 2, column + 3);
    groups.getCell(2, column).value = group;
    groups.getCell(3, column).value = "Team";
    groups.getCell(3, column + 1).value = "W";
    groups.getCell(3, column + 2).value = "L";
    groups.getCell(3, column + 3).value = "Qualified";
  }
  const teams = [
    "Aurora",
    "Beacon",
    "Cipher",
    "Drift",
    "Ember",
    "Fable",
    "Grove",
    "Harbor",
  ];
  teams.forEach(
    (team, index) =>
      (groups.getCell(4 + (index % 2), 2 + Math.floor(index / 2) * 5).value =
        team),
  );

  const addMatchInfo = (name: string, includeData: boolean) => {
    const sheet = workbook.addWorksheet(name);
    sheet.mergeCells("A1:F1");
    sheet.getCell("A1").value = "Match Info";
    ["Team 1", "Team 2", "Match", "ID", "Winner", "Match Length"].forEach(
      (value, index) => (sheet.getCell(2, index + 1).value = value),
    );
    sheet.addRow([
      "Example Team 1",
      "Example Team 2",
      "Example",
      12345678,
      "Example Team 1",
      0.02,
    ]);
    sheet.addRow([
      "Example Team 3",
      "Example Team 4",
      "Example",
      87654321,
      "Example Team 4",
      0.02,
    ]);
    if (includeData) {
      sheet.addRow([
        "Aurora",
        variant === "invalid" ? "Aurora" : "Beacon",
        "Qualifiers - Group A - Round 1",
        90000001,
        variant === "warnings" ? 12345 : "Aurora",
        0.02,
      ]);
      if (variant === "duplicate")
        sheet.addRow([
          "Aurora",
          "Beacon",
          "Qualifiers - Group A - Round 1",
          90000001,
          "Aurora",
          0.02,
        ]);
    }
  };
  addMatchInfo("QD1 Match info", true);
  workbook.addWorksheet("Qualifiers Day 2").getCell("A2").value =
    "Guildlock Qualifiers Day 2";
  addMatchInfo("QD2 Match Info", false);
  workbook.addWorksheet("LAN").getCell("A2").value = "Guildlock LAN";
  addMatchInfo("LAN Match Info", false);

  const rosters = workbook.addWorksheet("Rosters");
  rosters.getCell("B2").value = "Aurora";
  rosters.getCell("B3").value = "Role";
  rosters.getCell("C3").value = "IGN (In-Game Name)";
  rosters.getCell("D3").value = "Platform ID";
  rosters.getCell("E3").value = "Full Name";
  rosters.addRow([
    null,
    "Captain",
    "Player One",
    "private-001",
    "Fictional Person",
  ]);
  if (variant === "warnings")
    rosters.getCell("C5").value = '=HYPERLINK("https://invalid")';
  workbook.addWorksheet("Broadcast Talent").getCell("A1").value =
    "Out of scope";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
