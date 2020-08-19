import { GoogleSheet } from "./google-sheet";
import { RawDefinition, TeamRawDefinition } from "./raw-definition";
import { RowUpdater } from "./row-updater";
import { TeamRowUpdater } from "./team-row-updater";
import { TeamValidationUpdater } from "./team-validation-updater";
import request = require("request");
import * as moment from 'moment';

enum SortCategory {
  CURRENT_SPRINT = 'Current Sprint (milestone or fixVersions set) / Automatically updated',
  RECENT = 'RECENT ISSUES / LAST 3 Weeks / Automatically updated',
  NOT_UPDATED_SINCE_5_MONTHS = 'Stale issues ( > 5 months without update) / Automatically updated',
  NEW_NOTEWORTHY = 'New & Noteworthy / Automatically updated',
  BLOCKER = 'Blocker issues / Automatically updated',
  JIRA_CRITICAL = 'JIRA Critical issues / Automatically updated',
  GITHUB_P1 = 'Github P1 issues / Automatically updated',
  JIRA_MAJOR = 'JIRA Major issues / Automatically updated',
  GITHUB_P2 = 'Github P2 issues / Automatically updated',
  UNSORTED = 'Unsorted issues / Automatically updated',
}

export class TeamBacklogGenerator {

  private teamSheetIds: Map<string, number>;

  private prioritizationSheetIds: Map<string, number>;

  constructor(
    private googleSheet: GoogleSheet,
    private rowUpdater: RowUpdater,
  ) {
    this.teamSheetIds = new Map();
    this.teamSheetIds.set("controller", 559612723);
    this.teamSheetIds.set("deploy", 299792844);
    this.teamSheetIds.set("devex", 1791827752);
    this.teamSheetIds.set("doc", 1387892873);
    this.teamSheetIds.set("editors", 147601621);
    this.teamSheetIds.set("hosted-che", 602575269);
    this.teamSheetIds.set("platform", 615179376);
    this.teamSheetIds.set("plugins", 620995623);
    this.teamSheetIds.set("pm", 500634577);
    this.teamSheetIds.set("qe", 287072407);
    this.teamSheetIds.set("productization", 52078153);
    this.prioritizationSheetIds = new Map();
    this.prioritizationSheetIds.set("controller", 1025310347);
    this.prioritizationSheetIds.set("deploy", 2057979220);
    this.prioritizationSheetIds.set("doc", 109932545);
    this.prioritizationSheetIds.set("editors", 4019258);
    this.prioritizationSheetIds.set("hosted-che", 1631059017);
    this.prioritizationSheetIds.set("platform", 1013715978);
    this.prioritizationSheetIds.set("plugins", 480403075);
    this.prioritizationSheetIds.set("productization", 17628739);
    this.prioritizationSheetIds.set("qe", 2077165771);
  }

  public notifyStart(): void {
    this.notifySheet(this.teamSheetIds.get("controller")!, 'start');
  }

  public notifyEnd(): void {
    this.notifySheet(this.teamSheetIds.get("controller")!, 'stop');
  }

  protected async notifySheet(sheetId: number, state: 'start' | 'stop') {
    let rowHeight;
    let backgroundColor;
    if (state === 'start') {
      rowHeight = 120;
      backgroundColor = {
        red: 1.0,
        green: 0.0,
        blue: 0.0
      }
    } else {
      rowHeight = 3;
      backgroundColor = {
        red: 0.0,
        green: 1.0,
        blue: 0.0
      }
    }

    const requests = [];
    const sizeRequest =
    {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: 2
        },
        properties: {
          pixelSize: rowHeight
        },
        fields: 'pixelSize'
      }
    }
    requests.push(sizeRequest);
    const colorRequest =
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          endRowIndex: 2
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: backgroundColor
          }
        },
        "fields": "userEnteredFormat(backgroundColor)"
      }
    }

    requests.push(colorRequest);
    await this.googleSheet.batchUpdateOneOfRangeRequests(requests);
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

    const teamNames = Array.from(this.prioritizationSheetIds.keys());


    await Promise.all(Array.from(teamNames.map(async (teamName) => {
      // for each issue of backlog that includes the team, add the row if it doesn't exists
      const teamIssues = backlogRows.filter((row: any) => (row[backlogTeamColumn] && row[backlogTeamColumn].includes(teamName)));


      let rowNewIndex = 1;

      const sheetId = this.prioritizationSheetIds.get(teamName);
      await this.googleSheet.batchUpdateOneOfRangeRequests([{
        repeatCell: {
          range: {
            sheetId: sheetId,
          },
          cell: {
            userEnteredFormat: {
            }
          },
          "fields": "userEnteredFormat"
        }
      },
      {
        unmergeCells: {
          range: {
            sheetId: sheetId,
          }
        }
      },
      {
        updateCells: {
          range: {
            sheetId: sheetId
          },
          fields: "*"
        }
      }


      ]);

      // initialize map
      const sortedMap: Map<SortCategory, RawDefinition[]> = new Map();
      for (let entry in SortCategory) {
        sortedMap.set((SortCategory as any)[entry] as SortCategory, []);
      }
      teamIssues.forEach((row: any) => {
        const backLogIssueLink = row[backlogLinkColumn];
        const backlogIssueDef: RawDefinition = this.rowUpdater.getDefinition(row);

        const filters: Array<(backlogIssueDef: RawDefinition) => SortCategory | undefined> = [];

        const currentFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (backlogIssueDef.milestone) {
            return SortCategory.CURRENT_SPRINT;
          }
          return undefined;
        }

        const recentFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (backlogIssueDef.created) {
            const now = moment.utc();
            const timestamp = parseInt(backlogIssueDef.created);
            const lastUpdate = moment(timestamp);
            const duration = moment.duration(now.diff(lastUpdate));
            if (duration.asDays() < 21) {
              return SortCategory.RECENT;
            }
          }
          return undefined;
        }

        const newNoteworthyFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (backlogIssueDef.labels && backlogIssueDef.labels.includes('new&noteworthy')) {
            return SortCategory.NEW_NOTEWORTHY;
          }
          return undefined;
        }


        const severityCheck = (backlogIssueDef: RawDefinition, severity: string): boolean => {
          if (backlogIssueDef.severity && backlogIssueDef.severity.toLowerCase() === severity) {
            return true;
          }
          return false;
        }
        const blockerFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          return severityCheck(backlogIssueDef, 'blocker') ? SortCategory.BLOCKER : undefined
        }
        const jiraCriticalFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          return severityCheck(backlogIssueDef, 'critical') ? SortCategory.JIRA_CRITICAL : undefined
        }
        const githubP1Filter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          return severityCheck(backlogIssueDef, 'p1') ? SortCategory.GITHUB_P1 : undefined
        }

        const jiraMajorFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          return severityCheck(backlogIssueDef, 'major') ? SortCategory.JIRA_MAJOR : undefined
        }
        const githubP2Filter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          return severityCheck(backlogIssueDef, 'p2') ? SortCategory.GITHUB_P2 : undefined
        }


        const notUpdatedSince4Months = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          let lastUpdated;
          if (backlogIssueDef.created) {
            lastUpdated = backlogIssueDef.created;
          }
          if (backlogIssueDef.updated) {
            lastUpdated = backlogIssueDef.updated;
          }

          if (lastUpdated) {
            const now = moment.utc();
            const timestamp = parseInt(lastUpdated);
            const lastUpdate = moment(timestamp);
            const duration = moment.duration(now.diff(lastUpdate));
            if (duration.asDays() > 150) {
              return SortCategory.NOT_UPDATED_SINCE_5_MONTHS;
            }
          }
          return undefined;
        }

        // sort filters from priority to bottom
        filters.push(currentFilter);
        filters.push(recentFilter);
        filters.push(notUpdatedSince4Months);
        filters.push(newNoteworthyFilter);
        filters.push(blockerFilter);
        filters.push(jiraCriticalFilter);
        filters.push(githubP1Filter);
        filters.push(jiraMajorFilter);
        filters.push(githubP2Filter);

        let category: SortCategory | undefined;
        let index = 0;

        while (!category && index < filters.length) {
          category = filters[index](backlogIssueDef);
          index++;
        }
        if (!category) {
          // undefined
          category = SortCategory.UNSORTED;
        }

        const existingCategory = sortedMap.get(category);
        // keep only open stuff
        if (existingCategory && backlogIssueDef.state === 'open') {
          existingCategory.push(backlogIssueDef);
        }
      })


      const keys = Array.from(sortedMap.keys());

      const batchUpdates: any[] = [];
      const batchUpdateOneOfRangeRequests: any[] = [];

      const teamSheetName = `${teamName}-prio`;

      keys.forEach(key => {
        const title = `${key.toUpperCase()}`;

        const values = sortedMap.get(key)!;
        if (values.length > 0) {
          // insert title
          const update = {
            range: `${teamSheetName}!A${rowNewIndex}:A${rowNewIndex}`,
            values: [[title]],
          };


          const newValues = values.map(rawDefinition => {
            // replace double quotes by simple quotes
            let title = rawDefinition.title.replace(/"/g, '\'');

            const kind = rawDefinition.kind;
            let prefix = '';

            const severity = rawDefinition.severity;
            if (severity) {
              if (severity.toLowerCase() === 'blocker') {
                prefix += `🚫 `;
              } else if (severity.toLowerCase() === 'p1' || severity.toLowerCase() === 'critical') {
                prefix += `🔺 `;
              } else if (severity.toLowerCase() === 'p2' || severity.toLowerCase() === 'major') {
                prefix += `⬆  `;
              } else {
                prefix += `     `;
              }
            } else {
              prefix += `     `;
            }

            if (kind) {
              if (kind.toLowerCase() === 'epic') {
                prefix += `✨ `;
              } else if (kind.toLowerCase() === 'bug') {
                prefix += `🐞 `;
              } else if (kind.toLowerCase() === 'question') {
                prefix += `🤔 `;
              } else if (kind.toLowerCase() === 'enhancement' || kind.toLowerCase() === 'feature-request') {
                prefix += `💡 `;
              } else if (kind.toLowerCase() === 'task') {
                prefix += `🔧 `;
              } else if (kind.toLowerCase() === 'release') {
                prefix += `📦 `;
              } else {
                prefix += `     `;
              }
            } else {
              prefix += `     `;
            }


            // prefix issue number
            if (rawDefinition.link && rawDefinition.link.startsWith('https://issues.redhat.com/browse/')) {
              title = `${rawDefinition.link.substring('https://issues.redhat.com/browse/'.length)}: ${title}`;
            } else if (rawDefinition.link && rawDefinition.link.startsWith('https://github.com/eclipse/che/issues/')) {
              title = `GH-${rawDefinition.link.substring('https://github.com/eclipse/che/issues/'.length)}: ${title}`;
            }

            // add quote to not let numbers
            const milestone = `'${rawDefinition.milestone}`;
            return [`=HYPERLINK("${rawDefinition.link}", "${prefix}${title}")`, milestone, rawDefinition.assignee, this.getAreaLabels(rawDefinition.labels), rawDefinition.status, rawDefinition.link, kind, severity]
          });
          const endColumns = newValues[0].length;





          const backgroundColor = {
            red: 29 / 255,
            green: 35 / 255,
            blue: 132 / 255
          }
          const textFormat = {
            "foregroundColor": {
              "red": 1.0,
              "green": 1.0,
              "blue": 1.0
            },
            "fontSize": 10,
            "bold": true
          }

          const colorRequest =
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowNewIndex - 1,
                endRowIndex: rowNewIndex,
                startColumnIndex: 0,
                endColumnIndex: endColumns
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: backgroundColor,
                  textFormat: textFormat
                }
              },
              "fields": "userEnteredFormat(backgroundColor, textFormat)"
            }
          }
          const mergeCellRequest =
          {
            mergeCells: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowNewIndex - 1,
                endRowIndex: rowNewIndex,
                startColumnIndex: 0,
                endColumnIndex: endColumns
              },
              mergeType: "MERGE_ALL"
            }
          }

          batchUpdateOneOfRangeRequests.push(colorRequest);
          batchUpdateOneOfRangeRequests.push(mergeCellRequest);



          batchUpdates.push(update);
          rowNewIndex++;


          const valuesUpdate = {
            range: `${teamSheetName}!A${rowNewIndex}:H${rowNewIndex + values.length}`,
            values: newValues,
          };
          batchUpdates.push(valuesUpdate);


          const style = {
            style: "SOLID_THICK",
            width: 1,
            color: {
              red: 0.0,
              green: 0.0,
              blue: 0.0
            },
          }
          const cellBorderRequest = {
            updateBorders: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowNewIndex - 2, // -2 to include title
                endRowIndex: rowNewIndex + values.length - 1,
                startColumnIndex: 0,
                endColumnIndex: endColumns
              },
              top: style,
              bottom: style,
              left: style,
              right: style

            }
          }
          batchUpdateOneOfRangeRequests.push(cellBorderRequest);

          rowNewIndex = rowNewIndex + values.length;

          // empty line separator
          const emptyLineUpdate = {
            range: `${teamSheetName}!A${rowNewIndex}:C${rowNewIndex + 1}`,
            values: [['   ', '', '']],
          };
          batchUpdates.push(emptyLineUpdate);
          rowNewIndex++;


        }

      });

      // update
      if (batchUpdates.length > 0) {
        await this.googleSheet.valuesBatchUpdate(batchUpdates);
      }

      if (batchUpdateOneOfRangeRequests.length > 0) {
        await this.googleSheet.batchUpdateOneOfRangeRequests(batchUpdateOneOfRangeRequests);
      }


    })));

    await Promise.all(Array.from(this.teamSheetIds.keys()).map(async (teamName) => {

      const insertRows: string[][] = [];
      const batchUpdates: any[] = [];

      // now, get all issues of team sheet
      const sheetId = this.teamSheetIds.get(teamName)!;
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
          teamIssueDef.assignee = backlogIssueDef.assignee;

          // update row columns
          const update = {
            range: `${teamSheetName}!A${rowNumber}:M${rowNumber}`,
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
            assignee: backlogIssueDef.assignee,

          };

          // insert new row at the bottom
          // only copy open issues
          if (backlogIssueDef.state === 'open') {
            insertRows.push(teamRowUpdater.getRow(teamIssueDef));
          }

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
      const labels: string[] = [];
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
