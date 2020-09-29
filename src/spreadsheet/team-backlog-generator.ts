import { GoogleSheet } from "./google-sheet";
import { RawDefinition, TeamRawDefinition } from "./raw-definition";
import { RowUpdater } from "./row-updater";
import { TeamRowUpdater } from "./team-row-updater";
import { TeamValidationUpdater } from "./team-validation-updater";
import request = require("request");
import * as moment from 'moment';
import { CheVersionFetcher } from "../versions/che-version-fetcher";
import { CrwVersionFetcher } from "../versions/crw-version-fetcher";
import * as semver from "semver";
import { TheiaVersionFetcher } from "../versions/theia-version-fetcher";

enum SortCategory {
  PREVIOUS_SPRINT = '',
  CURRENT_SPRINT = '',
  NEXT_SPRINT = '',
  RECENT = 'RECENT ISSUES / LAST 3 Weeks order by priority then milestone / Automatically updated',
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

  public groupIdentifier(rawDefinition: RawDefinition): string {
    const shortIdentifier = this.shortIdentifier(rawDefinition);
    return shortIdentifier.split('-')[0];
  }

  public issueIdentifier(rawDefinition: RawDefinition): number {
    const shortIdentifier = this.shortIdentifier(rawDefinition);
    return parseInt(shortIdentifier.split('-')[1]);
  }


  public priorityNumber(rawDefinition: RawDefinition): number {
    if (rawDefinition.severity) {
      if (rawDefinition.severity.toLowerCase() === 'blocker') {
        return 1000;
      } else if (rawDefinition.severity.toLowerCase() === 'p1' || rawDefinition.severity.toLowerCase() === 'critical') {
        return 500
      } else if (rawDefinition.severity.toLowerCase() === 'p2' || rawDefinition.severity.toLowerCase() === 'major') {
        return 200;
      }
    }
    return 0;
  }

  public comparePriority(rawDefinition1: RawDefinition, rawDefinition2: RawDefinition): number {
    const prio1 = this.priorityNumber(rawDefinition1);
    const prio2 = this.priorityNumber(rawDefinition2);

      // compare priority identifier
      if (prio1 < prio2) {
        return 1
      } else if (prio1 == prio2) {
        return 0
      } else {
        return -1;
      }

  }

  public compareIdentifier(rawDefinition1: RawDefinition, rawDefinition2: RawDefinition): number {
    const group1 = this.groupIdentifier(rawDefinition1);
    const group2 = this.groupIdentifier(rawDefinition2);

    const issueIdentifier1 = this.issueIdentifier(rawDefinition1);
    const issueIdentifier2 = this.issueIdentifier(rawDefinition2);

    if (group1 === group2) {
      // compare issue identifier
      if (issueIdentifier1 < issueIdentifier2) {
        return -1
      } else if (issueIdentifier1 == issueIdentifier2) {
        return 0
      } else {
        return 1;
      }
    } else {
      return group1.localeCompare(group2);
    }

  }


  public shortIdentifier(rawDefinition: RawDefinition): string {
    if (rawDefinition.link) {
      if (rawDefinition.link.startsWith('https://issues.redhat.com/browse/')) {
        return rawDefinition.link.substring('https://issues.redhat.com/browse/'.length);
      } else if (rawDefinition.link && rawDefinition.link.startsWith('https://github.com/eclipse/che/issues/')) {
        return `GH-${rawDefinition.link.substring('https://github.com/eclipse/che/issues/'.length)}`;
      } else if (rawDefinition.link && rawDefinition.link.startsWith('https://github.com/eclipse-theia/theia/issues/')) {
        return `THEIA-${rawDefinition.link.substring('https://github.com/eclipse-theia/theia/issues/'.length)}`;
      } else {
        return rawDefinition.link;
      }
    }
    return rawDefinition.link;
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
          sheetId,
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
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2
        },
        cell: {
          userEnteredFormat: {
            backgroundColor
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
            sheetId,
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
            sheetId,
          }
        }
      },
      {
        updateCells: {
          range: {
            sheetId
          },
          fields: "*"
        }
      }


      ]);
      const batchUpdates: any[] = [];
      const batchUpdateOneOfRangeRequests: any[] = [];

      const teamSheetName = `${teamName}-prio`;

      const legend =  `🚫 sev/blocker, 🔺 sev/critical sev/p1, ⬆ sev/major sev/p2, ✨ kind/epic, 🐞 kind/bug, 🤔 kind/question, 💡 kind/enhancement, 🔧 kind/task, 📦 kind/release, 📖 new&noteworthy, ⏰ stale (> 150days without update)`;

      const valuesUpdate = {
        range: `${teamSheetName}!A${rowNewIndex}:A${rowNewIndex + 1}`,
        values: [[legend]],
      };
      batchUpdates.push(valuesUpdate);
      rowNewIndex = rowNewIndex + 2;

      // current che milestone =
      const cheVersionFetcher = new CheVersionFetcher();
      await cheVersionFetcher.init();
      const cheCurrentSprintMilestone = await cheVersionFetcher.getCurrentSprint();
      const cheNextSprintMilestone = await cheVersionFetcher.getNextSprint();
      const chePreviousprintMilestone = await cheVersionFetcher.getPreviousSprint();

      // current CRW milestone =
      const crwVersionFetcher = new CrwVersionFetcher();
      await crwVersionFetcher.init();
      const crwCurrentSprintMilestone = await crwVersionFetcher.getCurrentSprint();
      const crwNextSprintMilestone = await crwVersionFetcher.getNextSprint();
      const crwPreviousSprintMilestone = await crwVersionFetcher.getPreviousSprint();

      // current Theia milestone =
      const theiaVersionFetcher = new TheiaVersionFetcher();
      await theiaVersionFetcher.init();
      const theiaCurrentSprintMilestone = await theiaVersionFetcher.getCurrentSprint();
      const theiaNextSprintMilestone = await theiaVersionFetcher.getNextSprint();
      const theiaPreviousSprintMilestone = await theiaVersionFetcher.getPreviousSprint();
      
      // update title
      (SortCategory as any)['PREVIOUS_SPRINT'] = `Ended Sprint (CHE/${chePreviousprintMilestone} CRW/${crwPreviousSprintMilestone} THEIA/${theiaPreviousSprintMilestone}) / order by priority then milestone / Automatically updated`;
      (SortCategory as any)['CURRENT_SPRINT'] = `Current Sprint (CHE/${cheCurrentSprintMilestone} CRW/${crwCurrentSprintMilestone} THEIA/${theiaCurrentSprintMilestone}) / order by priority then milestone / Automatically updated`;
      (SortCategory as any)['NEXT_SPRINT'] = `Candidate Sprint (CHE/${cheNextSprintMilestone} CRW/${crwNextSprintMilestone} THEIA/${theiaNextSprintMilestone}) / order by priority then milestone / Automatically updated`;

      // initialize map
      const sortedMap: Map<SortCategory, RawDefinition[]> = new Map();
      for (const entry in SortCategory) {
        sortedMap.set((SortCategory as any)[entry] as SortCategory, []);
      }
      teamIssues.forEach((row: any) => {
        const backLogIssueLink = row[backlogLinkColumn];
        const backlogIssueDef: RawDefinition = this.rowUpdater.getDefinition(row);

        const filters: ((backlogIssueDef: RawDefinition) => SortCategory | undefined)[] = [];

        const previousFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (chePreviousprintMilestone) {
            if (chePreviousprintMilestone === backlogIssueDef.milestone) {
              return SortCategory.PREVIOUS_SPRINT;
            }
          }
          if (crwPreviousSprintMilestone) {
            if (crwPreviousSprintMilestone === backlogIssueDef.milestone) {
              return SortCategory.PREVIOUS_SPRINT;
            }
          }
          if (theiaPreviousSprintMilestone) {
            if (theiaPreviousSprintMilestone === backlogIssueDef.milestone && backlogIssueDef.link && backlogIssueDef.link.startsWith('https://github.com/eclipse-theia/theia/issues/')) {
              return SortCategory.PREVIOUS_SPRINT;
            }
          }

          return undefined;
        }

        const currentFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (cheCurrentSprintMilestone) {
            if (cheCurrentSprintMilestone === backlogIssueDef.milestone) {
              return SortCategory.CURRENT_SPRINT;
            }
          }
          if (crwCurrentSprintMilestone) {
            if (crwCurrentSprintMilestone === backlogIssueDef.milestone) {
              return SortCategory.CURRENT_SPRINT;
            }
          }
          if (theiaCurrentSprintMilestone) {
            if (theiaCurrentSprintMilestone === backlogIssueDef.milestone && backlogIssueDef.link && backlogIssueDef.link.startsWith('https://github.com/eclipse-theia/theia/issues/')) {
              return SortCategory.CURRENT_SPRINT;
            }
          }

          return undefined;
        }

        const nextFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (cheNextSprintMilestone) {
            if (cheNextSprintMilestone === backlogIssueDef.milestone) {
              return SortCategory.NEXT_SPRINT;
            }
          }
          if (crwNextSprintMilestone) {
            if (crwNextSprintMilestone === backlogIssueDef.milestone) {
              return SortCategory.NEXT_SPRINT;
            }
          }
          if (theiaNextSprintMilestone) {
            if (theiaNextSprintMilestone === backlogIssueDef.milestone && backlogIssueDef.link && backlogIssueDef.link.startsWith('https://github.com/eclipse-theia/theia/issues/')) {
              return SortCategory.NEXT_SPRINT;
            }
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

       /* const newNoteworthyFilter = (backlogIssueDef: RawDefinition): SortCategory | undefined => {
          if (backlogIssueDef.labels && backlogIssueDef.labels.includes('new&noteworthy')) {
            return SortCategory.NEW_NOTEWORTHY;
          }
          return undefined;
        }*/


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

/*
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
        }*/

        // sort filters from priority to bottom
        filters.push(previousFilter);
        filters.push(currentFilter);
        filters.push(nextFilter);
        filters.push(recentFilter);
        // filters.push(notUpdatedSince4Months);
        // filters.push(newNoteworthyFilter);
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
      });

      // sort sections following different rules

      const currentSprintValues: RawDefinition[] = sortedMap.get(SortCategory.CURRENT_SPRINT)!;
      // sort by priority then milestone
      currentSprintValues.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {

          if (this.priorityNumber(rawDefinition1) === this.priorityNumber(rawDefinition2)) {
            return rawDefinition1.milestone.localeCompare(rawDefinition2.milestone);
          } else {
            return this.comparePriority(rawDefinition1, rawDefinition2);
          }
      });

      const nextSprintValues: RawDefinition[] = sortedMap.get(SortCategory.NEXT_SPRINT)!;
      // sort by priority then milestone
      nextSprintValues.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {

          if (this.priorityNumber(rawDefinition1) === this.priorityNumber(rawDefinition2)) {
            return rawDefinition1.milestone.localeCompare(rawDefinition2.milestone);
          } else {
            return this.comparePriority(rawDefinition1, rawDefinition2);
          }
      });

      const previousSprintValues: RawDefinition[] = sortedMap.get(SortCategory.PREVIOUS_SPRINT)!;
      // sort by priority then milestone
      previousSprintValues.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {

          if (this.priorityNumber(rawDefinition1) === this.priorityNumber(rawDefinition2)) {
            return rawDefinition1.milestone.localeCompare(rawDefinition2.milestone);
          } else {
            return this.comparePriority(rawDefinition1, rawDefinition2);
          }
      });


      // recentValues order by priority
      const recentValues: RawDefinition[] = sortedMap.get(SortCategory.RECENT)!;
      recentValues.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {

        if (this.priorityNumber(rawDefinition1) === this.priorityNumber(rawDefinition2)) {
          return rawDefinition1.milestone.localeCompare(rawDefinition2.milestone);
        } else {
          return this.comparePriority(rawDefinition1, rawDefinition2);
        }
      });

      // not updated, sort by least updated
      /*sortedMap.get(SortCategory.NOT_UPDATED_SINCE_5_MONTHS)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {

        let updated1 = rawDefinition1.created;
        let updated2 = rawDefinition2.created;
        if (rawDefinition1.updated) {
          updated1 = rawDefinition1.updated;
        }
        if (rawDefinition2.updated) {
          updated2 = rawDefinition2.updated;
        }

        if (updated1 && updated2) {
          if (updated1 === updated2) {
            return this.compareIdentifier(rawDefinition1, rawDefinition2);
          }
          // least updated
          if (parseInt(updated1) < parseInt(updated2)) {
            return -1
          } else if (parseInt(updated1) == parseInt(updated2)) {
            return 0
          } else {
            return 1;
          }
        } else {
          return this.compareIdentifier(rawDefinition1, rawDefinition2);
        }
      });*/

      // others = order by issue number
      sortedMap.get(SortCategory.BLOCKER)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });
      sortedMap.get(SortCategory.GITHUB_P1)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });
      sortedMap.get(SortCategory.GITHUB_P2)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });
      sortedMap.get(SortCategory.JIRA_CRITICAL)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });
      sortedMap.get(SortCategory.JIRA_MAJOR)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });
      /*sortedMap.get(SortCategory.NEW_NOTEWORTHY)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });*/
      sortedMap.get(SortCategory.UNSORTED)!.sort((rawDefinition1: RawDefinition, rawDefinition2: RawDefinition) => {
        return this.compareIdentifier(rawDefinition1, rawDefinition2);
      });


      const keys = Array.from(sortedMap.keys());


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

            // stale issues
            let appendix = '';
            let lastUpdated;
            if (rawDefinition.created) {
              lastUpdated = rawDefinition.created;
            }
            if (rawDefinition.updated) {
              lastUpdated = rawDefinition.updated;
            }
  
            if (lastUpdated) {
              const now = moment.utc();
              const timestamp = parseInt(lastUpdated);
              const lastUpdate = moment(timestamp);
              const duration = moment.duration(now.diff(lastUpdate));
              if (duration.asDays() > 150) {
                appendix += '⏰ ';
              }
            }

            if (rawDefinition.labels && rawDefinition.labels.includes('new&noteworthy')) {
              appendix += '📖 ';
            }
  
            // prefix issue number
            title = `${this.shortIdentifier(rawDefinition)}: ${appendix}${title}`;

            // add quote to not let numbers
            let milestone;
            if (rawDefinition.milestone && rawDefinition.milestone.length > 0) {
              milestone = `'${rawDefinition.milestone}`;
            } else {
              milestone = ' ';
            }
            let assignee;
            if (rawDefinition.assignee && rawDefinition.assignee.length > 0) {
              assignee = rawDefinition.assignee;
            } else {
              assignee = ' ';
            }
            let status;
            if (rawDefinition.status && rawDefinition.status.length > 0) {
              status = rawDefinition.status;
            } else {
              status = ' ';
            }
            let labels = this.getAreaLabels(rawDefinition.labels, ",");
            if (labels.length  === 0) {
              labels = ' ';
            }
            return [`=HYPERLINK("${rawDefinition.link}", "${prefix}${title}")`, milestone, assignee, labels, status]
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
                sheetId,
                startRowIndex: rowNewIndex - 1,
                endRowIndex: rowNewIndex,
                startColumnIndex: 0,
                endColumnIndex: endColumns
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor,
                  textFormat
                }
              },
              "fields": "userEnteredFormat(backgroundColor, textFormat)"
            }
          }
          const mergeCellRequest =
          {
            mergeCells: {
              range: {
                sheetId,
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
            range: `${teamSheetName}!A${rowNewIndex}:E${rowNewIndex + values.length}`,
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
                sheetId,
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

  getAreaLabels(labelLine: string, separator?: string): string {
    const useSeparator = separator ? separator : '\n';
    if (labelLine && labelLine.length > 0) {
      const labels: string[] = [];
      const originLabels = labelLine.split(',');
      originLabels.forEach(originLabel => {
        originLabel.split('\n').forEach(item => labels.push(item));
      });
      return labels.filter(item => item.startsWith('area/')).map(item => item.substring('area/'.length)).sort().join(useSeparator);
    } else {
      return '';
    }
  }

}
