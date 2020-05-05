import { IssueInfo } from "../issue/issue-info";
import { Authentication } from "./authentication";
import { GoogleSheet } from "./google-sheet";
import { RawDefinition } from "./raw-definition";
import { RowUpdater } from "./row-updater";
let JiraClient = require("jira-connector");
/**
 * Manage the import from JIRA
 */
export class JiraImport {

  constructor(
    private token: string,
    private googleSheet: GoogleSheet,
    private rowUpdater: RowUpdater,
  ) {
  }

  public async import(): Promise<void> {

    let jira = new JiraClient({
      host: "issues.redhat.com",
      basic_auth: {
        base64: this.token,
      },
    });

    const mergedIssues: any = [];
    // first import
    // const jql = 'project=CRW AND status not in (closed, resolved)';
    // update
    const jql = "project=CRW AND updated>=-1D";
    const data = await jira.search.search({ jql, maxResults: 0 });
    const total = data.total;
    let nbRead = 0;
    while (nbRead < total) {
      const partialData = await jira.search.search({ jql, maxResults: 10, startAt: nbRead });
      nbRead = nbRead + 10;
      mergedIssues.push(...partialData.issues);
    }

    await this.handleIssues(mergedIssues);

  }

  public async handleIssues(jiraIssueData: any): Promise<void> {

    const sheetData = await this.googleSheet.getData({ range: "backlog!A1:U" });
    const rows = sheetData.values;

    // get column name
    const header = rows[0];

    // get column of links
    const linkColumn = header.findIndex((data: string) => data.toLowerCase() === "link");

    // get mapping between issue link and row number
    const issueMapping: Map<string, number> = new Map(rows.map((row: any, index: number) => [row[linkColumn], index + 1]));

    // check if some issues have been closed or not to remove items

    // now perform updates per row

    const insertRows: string[][] = [];
    const batchUpdates: any[] = [];
    jiraIssueData.map(async (issueData: any) => {

      // link of the issue
      const issueLink = "https://issues.redhat.com/browse/" + issueData.key;

      // get mapping of the issue if exists

      if (issueMapping.has(issueLink)) {
        // get row index
        const rowNumber: number = issueMapping.get(issueLink)!;
        const rowIndex = rowNumber - 1;

        const issueDef: RawDefinition = this.rowUpdater.getDefinition(rows[rowIndex]);
        issueDef.team = this.getTeam(issueData);
        issueDef.kind = this.getKind(issueData);
        issueDef.severity = this.getSeverity(issueData);
        issueDef.title = this.getTitle(issueData);
        issueDef.link = issueLink;
        issueDef.state = this.getState(issueData);
        issueDef.status = this.getStatus(issueData);
        issueDef.milestone = this.getMilestone(issueData);

        // update row columns
        const update = {
          range: `${GoogleSheet.SHEET_NAME}!A${rowNumber}:U${rowNumber}`,
          values: [this.rowUpdater.getRow(issueDef)],
        };

        batchUpdates.push(update);

      } else {
        const issueDef: RawDefinition = {
          team: this.getTeam(issueData),
          include: this.isIncluded(issueData),
          status: this.getStatus(issueData),
          milestone: this.getMilestone(issueData),
          kind: this.getKind(issueData),
          labels: "",
          severity: this.getSeverity(issueData),
          title: this.getTitle(issueData),
          link: issueLink,
          comments: "",
          state: this.getState(issueData),

        };

        // insert new row at the bottom
        insertRows.push(this.rowUpdater.getRow(issueDef));

      }

    });

    // rows to insert
    if (insertRows.length > 0) {
      await this.googleSheet.appendRow(insertRows);
    }

    // update
    if (batchUpdates.length > 0) {
      await this.googleSheet.valuesBatchUpdate(batchUpdates);
    }

  }

  public getTitle(issueData: any): string {
    return issueData.fields.summary;
  }

  public isIncluded(issueInfo: IssueInfo): boolean {
    return this.getKind(issueInfo).toLowerCase() === "epic";
  }

  public getKind(issueData: any): string {
    if (issueData.fields.issuetype && issueData.fields.issuetype.name) {
      return issueData.fields.issuetype.name.toLowerCase();
    }
    return "";
  }

  public getStatus(issueData: any): string {
    if (issueData.fields.status && issueData.fields.status.name) {
      return issueData.fields.status.name.toLowerCase();
    }
    return "";
  }

  public getMilestone(issueData: any): string {
    if (issueData.fields.fixVersions) {
      const versions = issueData.fields.fixVersions;
      let milestones: string[] = [];
      if (versions.length > 0) {
        versions.forEach((version: any) => {
          milestones.push(version.name)
        })
        return milestones.join(',');
      }
    }
    return "";
  }

  public getSeverity(issueData: any): string {
    if (issueData.fields.priority && issueData.fields.priority.name) {
      return issueData.fields.priority.name;
    } else {
      return "";
    }
  }

  public getTeam(issueData: any): string {

    const areasTeams = new Map();
    areasTeams.set("OpenShift Command Line Terminal (cloudshell)", "controller");
    areasTeams.set("controller: dashboard, dev-workspace, factory/dashboard, plugin broker, ts-workspace-client, workspace-loader", "controller");
    areasTeams.set("deploy: cli, install, machine-exec, operator", "deploy");
    areasTeams.set("devex: workshops, RHPDS", "devex");
    areasTeams.set("docs", "docs");
    areasTeams.set("editors: theia", "editors");
    areasTeams.set("languages: debugger, devfiles, lsp, samples, stacks", "plugins");
    areasTeams.set("ocp", "qe");
    areasTeams.set("platform: jwtproxy, wsmaster, devfile spec, teams, security, sharing, factory api, monitoring", "platform");
    areasTeams.set("plugins: registries, factories, git", "plugins");
    areasTeams.set("productization: build & internals", "productization");
    areasTeams.set("productization: security & legal", "productization");
    areasTeams.set("testing", "qe");
    

    const matchingTeams: string[] = [];
    // get areas label

    const components = issueData.fields.components;
    if (components) {
      components.forEach((component: any) => {
        const componentName = component.name || "";
        if (componentName !== '') {
          const team = areasTeams.get(componentName);
          if (team && !matchingTeams.includes(team)) {
            matchingTeams.push(team);
          }
        }
      });
    }
    matchingTeams.sort();

    if (matchingTeams.length === 0) {
      return "N/A";
    } else if (matchingTeams.length === 1) {
      return matchingTeams[0];
    } else {
      return `${matchingTeams.join(",")}`;
    }

  }

  public getState(issueData: any): string {
    if (!issueData.fields.status.name || (issueData.fields.status.name.toLowerCase() !== "closed" && issueData.fields.status.name.toLowerCase() !== "resolved")) {
      return "open";
    } else {
      return "closed";
    }
  }

}
