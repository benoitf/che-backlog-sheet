import { GoogleSheet } from "./google-sheet";
import { RawDefinition, TeamRawDefinition } from "./raw-definition";
import { RowUpdater } from "./row-updater";
import { TeamRowUpdater } from "./team-row-updater";
import { TeamValidationUpdater } from "./team-validation-updater";

export class TeamBacklogGenerator {

  constructor(
    private googleSheet: GoogleSheet,
    private rowUpdater: RowUpdater,
  ) {
  }

  public async import(): Promise<void> {

    const sheetData = await this.googleSheet.getData({ range: `${GoogleSheet.SHEET_NAME}!A1:U` });
    const backlogRows = sheetData.values;

    // get column name
    const backlogHeader = backlogRows[0];

    // get column of links
    const backlogIncludeColumn = backlogHeader.findIndex((data: string) => data.toLowerCase() === "include");
    const backlogTeamColumn = backlogHeader.findIndex((data: string) => data.toLowerCase() === "team");
    const backlogLinkColumn = backlogHeader.findIndex((data: string) => data.toLowerCase() === "link");

    // get mapping between issue link and row index
    const backlogIssueMappingIndex: Map<string, number> = new Map(backlogRows.map((row: any, index: number) => [row[backlogLinkColumn], index]));

    const teamSheetIds: Map<string, number> = new Map();

    teamSheetIds.set("controller", 559612723);
    teamSheetIds.set("deploy", 299792844);
    teamSheetIds.set("devex", 1791827752);
    teamSheetIds.set("doc", 1387892873);
    teamSheetIds.set("editors", 147601621);
    teamSheetIds.set("hosted-che", 602575269);
    teamSheetIds.set("platform", 615179376);
    teamSheetIds.set("plugins", 620995623);
    teamSheetIds.set("pm", 500634577);
    teamSheetIds.set("qe", 287072407);
    teamSheetIds.set("productization", 52078153);

    await Promise.all(Array.from(teamSheetIds.keys()).map(async (teamName) => {

      const insertRows: string[][] = [];
      const batchUpdates: any[] = [];

      // now, get all issues of controller sheet
      const sheetId = teamSheetIds.get(teamName)!;
      const teamSheetName = `${teamName}-backlog`;
      const teamSheetData = await this.googleSheet.getData({ range: `${teamSheetName}!A1:Z` });
      const teamBacklogRows = teamSheetData.values;

      // get column name
      const teamBacklogHeader = teamBacklogRows[0];

      // get column of links
      const teamBacklogLinkColumn = teamBacklogHeader.findIndex((data: string) => data.toLowerCase() === "link");

      // for each issue of backlog that includes the team, add the row if it doesn't exists
      const teamIssues = backlogRows.filter((row: any) => (row[backlogTeamColumn] && row[backlogTeamColumn].includes(teamName)));

      // get only issues included
      const includedTeamIssues = teamIssues.filter((row: any) => (row[backlogIncludeColumn] === "TRUE"));

      // get mapping between inluded issues and index (the priority)
      const includedTeamPriority: Map<string, string> = new Map(includedTeamIssues.map((row: any, index: number) => [row[backlogLinkColumn], `${index + 1}`]));

      // get mapping between issue link and row number
      const teamBackLogIssueMapping: Map<string, number> = new Map(teamBacklogRows.map((row: any, index: number) => [row[teamBacklogLinkColumn], index + 1]));

      // ok, now we have the backlog for the team

      // now try to insert or update
      const teamRowUpdater = new TeamRowUpdater(teamBacklogHeader);

      // now, search if some lines need to be removed from the current team backlog
      // Check if we have some rows in team backlog that are no longer assigned to this team
      Array.from(teamBackLogIssueMapping.keys()).forEach((teamIssueLink: string) => {
        // now grab this issue from big backlog
        const indexFromBacklog = backlogIssueMappingIndex.get(teamIssueLink);
        if (indexFromBacklog) {
          const backlogRow = backlogRows[indexFromBacklog];
          const teamValue = backlogRow[backlogTeamColumn];
          // team is not included in the issue !
          if (teamValue && !teamValue.includes(teamName)) {
            // update first column to remove assignment

            const rowNumber = teamBackLogIssueMapping.get(teamIssueLink);

            const update = {
              range: `${teamSheetName}!A${rowNumber}:A${rowNumber}`,
              values: [["FALSE"]],
            };
            batchUpdates.push(update);
          }
        }

      });

      teamIssues.forEach((row: any, index: number) => {

        const backLogIssueLink = row[backlogLinkColumn];
        const backlogIssueDef: RawDefinition = this.rowUpdater.getDefinition(row);

        const issueAreas = this.getAreaLabels(backlogIssueDef.labels);
        const issuePriority = includedTeamPriority.get(backLogIssueLink) || "";

        if (teamBackLogIssueMapping.has(backLogIssueLink)) {
          // get row index
          const rowNumber: number = teamBackLogIssueMapping.get(backLogIssueLink)!;
          const rowIndex = rowNumber - 1;

          // get row from original backlog
          const teamIssueDef: TeamRawDefinition = teamRowUpdater.getDefinition(teamBacklogRows[rowIndex]);

          teamIssueDef.priority = issuePriority;
          teamIssueDef.severity = backlogIssueDef.severity;
          teamIssueDef.title = backlogIssueDef.title;
          teamIssueDef.kind = backlogIssueDef.kind;
          teamIssueDef.milestone = backlogIssueDef.milestone;
          teamIssueDef.otherTeam = backlogIssueDef.team;
          teamIssueDef.state = backlogIssueDef.state;
          teamIssueDef.status = backlogIssueDef.status;
          teamIssueDef.assignment = "TRUE";
          teamIssueDef.areas = issueAreas;

          // update row columns
          const update = {
            range: `${teamSheetName}!A${rowNumber}:L${rowNumber}`,
            values: [teamRowUpdater.getRow(teamIssueDef)],
          };

          batchUpdates.push(update);

        } else {

          const teamIssueDef: TeamRawDefinition = {
            assignment: "TRUE",
            priority: issuePriority,
            severity: backlogIssueDef.severity,
            title: backlogIssueDef.title,
            kind: backlogIssueDef.kind,
            link: backlogIssueDef.link,
            milestone: backlogIssueDef.milestone,
            otherTeam: backlogIssueDef.team,
            comments: "",
            state: backlogIssueDef.state,
            status: backlogIssueDef.status,
            areas: issueAreas,


          };

          // insert new row at the bottom
          insertRows.push(teamRowUpdater.getRow(teamIssueDef));

        }

      });

      // rows to insert
      if (insertRows.length > 0) {
        await this.googleSheet.appendSheetRow(teamSheetName, insertRows);
      }

      // update
      if (batchUpdates.length > 0) {
        await this.googleSheet.valuesBatchUpdate(batchUpdates);
      }

      const teamValidationUpdater = new TeamValidationUpdater(this.googleSheet, teamSheetName, sheetId);
      await teamValidationUpdater.update();
    }));

  }

  getAreaLabels(labelLine: string): string {
    if (labelLine && labelLine.length > 0) {
      const labels : string[] = [];
      const originLabels = labelLine.split(',');
      originLabels.forEach(originLabel => {
        originLabel.split('\n').forEach(item => labels.push(item));
      });
      return labels.filter(item => item.startsWith('area/')).map(item => item.substring('area/'.length)).sort().join('\n');
    } else {
      return '';
    }
  }

}
