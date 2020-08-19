import { IssueInfo } from "../issue/issue-info";
import { Authentication } from "./authentication";
import { GoogleSheet } from "./google-sheet";
import { RawDefinition } from "./raw-definition";
import { RowUpdater } from "./row-updater";
const JiraClient = require("jira-connector");
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

    const jira = new JiraClient({
      host: "issues.redhat.com",
      basic_auth: {
        base64: this.token,
      },
    });

    await this.importCRW(jira);
    await this.importCRT(jira);
    await this.importWTO(jira);
    await this.importRHDEVDOCS(jira);
  }

  protected async importCRW(jira: any): Promise<void> {
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

  protected async importCRT(jira: any): Promise<void> {
    const mergedIssues: any = [];
    // first import
    // const jql = "project = CRT and labels in ('cheteam') and labels not in ('WIP') AND status not in (closed, resolved)";
    // update
    const jql = "project = CRT and labels in ('cheteam') and labels not in ('WIP') AND updated>=-1D";
    const data = await jira.search.search({ jql, maxResults: 0 });
    const total = data.total;
    let nbRead = 0;
    while (nbRead < total) {
      const partialData = await jira.search.search({ jql, maxResults: 10, startAt: nbRead });
      nbRead = nbRead + 10;
      mergedIssues.push(...partialData.issues);
    }



    // update to include team to be hosted-che
    const updatedIssues = mergedIssues.map((issueData: any) => {
      const components = issueData.fields.components;
      const hostedCheComponent = { name: 'area/hosted-che' };
      if (!components) {
        issueData.fields.components = [hostedCheComponent];
      } else {
        issueData.fields.components.push(hostedCheComponent);
      }
      return issueData;
    });


    await this.handleIssues(updatedIssues);
  }


  protected async importWTO(jira: any): Promise<void> {
    const mergedIssues: any = [];
    // first import
    // const jql = "project = WTO and labels in ('cheteam') and labels not in ('WIP') AND status not in (closed, resolved)";
    // update
    const jql = "project = WTO AND updated>=-1D";
    const data = await jira.search.search({ jql, maxResults: 0 });
    const total = data.total;
    let nbRead = 0;
    while (nbRead < total) {
      const partialData = await jira.search.search({ jql, maxResults: 10, startAt: nbRead });
      nbRead = nbRead + 10;
      mergedIssues.push(...partialData.issues);
    }



    // update to include team to be hosted-che
    const updatedIssues = mergedIssues.map((issueData: any) => {
      const components = issueData.fields.components;
      const controllerComponent = { name: 'area/cloudshell' };
      if (!components) {
        issueData.fields.components = [controllerComponent];
      } else {
        issueData.fields.components.push(controllerComponent);
      }
      return issueData;
    });


    await this.handleIssues(updatedIssues);
  }


  protected async importRHDEVDOCS(jira: any): Promise<void> {
    const mergedIssues: any = [];
    // first import
    // const jql = "project = RHDEVDOCS AND (component = 'Eclipse Che' OR component = 'CodeReady Workspaces') AND status not in (closed, resolved)";
    // update
    const jql = "project = RHDEVDOCS AND (component = 'Eclipse Che' OR component = 'CodeReady Workspaces') AND updated>=-1D";
    const data = await jira.search.search({ jql, maxResults: 0 });
    const total = data.total;
    let nbRead = 0;
    while (nbRead < total) {
      const partialData = await jira.search.search({ jql, maxResults: 10, startAt: nbRead });
      nbRead = nbRead + 10;
      mergedIssues.push(...partialData.issues);
    }

    // update to include team to be hosted-che
    const updatedIssues = mergedIssues.map((issueData: any) => {
      const components = issueData.fields.components;
      const docComponent = { name: 'area/doc' };
      if (!components) {
        issueData.fields.components = [docComponent];
      } else {
        issueData.fields.components.push(docComponent);
      }
      return issueData;
    });


    await this.handleIssues(updatedIssues);
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
        issueDef.assignee = this.getAssignee(issueData);
        issueDef.created = this.getCreated(issueData);
        issueDef.updated = this.getUpdated(issueData);
        issueDef.closed = this.getClosed(issueData);

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
          assignee: this.getAssignee(issueData),
          state: this.getState(issueData),
          created: this.getCreated(issueData),
          updated: this.getUpdated(issueData),
          closed: this.getClosed(issueData),

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

  public getAssignee(issueData: any): string {
    if (issueData.fields.assignee && issueData.fields.assignee.name) {
      return issueData.fields.assignee.name.toLowerCase();
    }
    return "";
  }

  public getMilestone(issueData: any): string {
    if (issueData.fields.fixVersions) {
      const versions = issueData.fields.fixVersions;
      const milestones: string[] = [];
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
    areasTeams.set("hosted che: telemetry, kubernetes-image-puller", "hosted-che");
    areasTeams.set("area/hosted-che", "hosted-che");
    areasTeams.set("area/cloudshell", "controller");
    areasTeams.set("area/doc", "doc");


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

  public getCreated(issueData: any): string {
    if (issueData.fields.created) {
      const date = new Date(issueData.fields.created).getTime();
      return `${date}`;
    }
    return "";
  }

  public getUpdated(issueData: any): string {
    if (issueData.fields.updated) {
      const date = new Date(issueData.fields.updated).getTime();
      return `${date}`;
    }
    return "";
  }

  public getClosed(issueData: any): string {
    if (issueData.fields.resolutiondate) {
      const date = new Date(issueData.fields.resolutiondate).getTime();
      return `${date}`;
    }
    return "";
  }


}
