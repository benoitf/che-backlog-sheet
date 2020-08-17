import { Octokit } from "@octokit/rest";
import { IssueInfo } from "../issue/issue-info";
import { Authentication } from "./authentication";
import { GoogleSheet } from "./google-sheet";
import { RawDefinition } from "./raw-definition";
import { RowUpdater } from "./row-updater";

/**
 * Manage the import from github
 */
export class GithubImport {

  constructor(
    private githubRead: Octokit,
    private googleSheet: GoogleSheet,
    private rowUpdater: RowUpdater,
  ) {
  }

  public async import(): Promise<void> {
    // const PREVIOUS_DAYS = 3600;
    const PREVIOUS_DAYS = 1;

    // compute PREVIOUS_DAYS days from now in the past
    const beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() - PREVIOUS_DAYS);
    const simpleDate = beforeDate.toISOString().substring(0, 10);

    await this.importChe(simpleDate);
    await this.importRedhatChe(simpleDate);
  }

  public async importChe(simpleDate: string): Promise<void> {

    // get all issues not updated since this date and that are not in frozen state
    const options = this.githubRead.search.issuesAndPullRequests.endpoint.merge({
      q: `repo:eclipse/che updated:>=${simpleDate} is:issue`, // state:open for first import
      sort: "updated",
      order: "asc",
      per_page: 100,
    });

    const response = await this.githubRead.paginate(options);
    await this.handleIssues(response);

  }

  public async importRedhatChe(simpleDate: string): Promise<void> {
    // get all issues not updated since this date and that are not in frozen state
    const options = this.githubRead.search.issuesAndPullRequests.endpoint.merge({
      q: `repo:redhat-developer/rh-che updated:>=${simpleDate} is:issue`, // state:open for first import
      sort: "updated",
      order: "asc",
      per_page: 100,
    });

    const response = await this.githubRead.paginate(options);

    // update to include team to be hosted-che
    const updatedIssues = response.map((issueData: any) => {
      let labels = issueData.labels;
      const hostedCheLabel = {name: 'area/hosted-che' };
      if (!labels) {
        issueData.labels = [hostedCheLabel];
      } else {
        issueData.labels.push(hostedCheLabel);
      }
      return issueData;
    });
    await this.handleIssues(updatedIssues);

  }  

  public async handleIssues(issueData: any): Promise<void> {
    const githubIssuesInfos: IssueInfo[] = issueData.map((issueData: any) => new IssueInfo(issueData, "che"));

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
    githubIssuesInfos.forEach((issueInfo) => {
      // get mapping of the issue if exists

      if (issueMapping.has(issueInfo.humanUrl())) {
        // get row index
        const rowNumber: number = issueMapping.get(issueInfo.humanUrl())!;
        const rowIndex = rowNumber - 1;

        const issueDef: RawDefinition = this.rowUpdater.getDefinition(rows[rowIndex]);
        issueDef.team = this.getTeam(issueInfo);
        issueDef.kind = this.getKind(issueInfo);
        issueDef.labels = issueInfo.labels().join("\n");
        issueDef.severity = this.getSeverity(issueInfo);
        issueDef.link = issueInfo.humanUrl();
        issueDef.title = issueInfo.title();
        issueDef.state = this.getState(issueInfo);
        issueDef.milestone = this.getMilestone(issueInfo);
        issueDef.status = this.getStatus(issueInfo);
        issueDef.assignee = this.getAssignee(issueInfo);
        issueDef.created = issueInfo.getCreated();
        issueDef.updated = issueInfo.getUpdated();
        issueDef.closed = issueInfo.getClosed();

        // update row columns
        const update = {
          range: `${GoogleSheet.SHEET_NAME}!A${rowNumber}:U${rowNumber}`,
          values: [this.rowUpdater.getRow(issueDef)],
        };

        batchUpdates.push(update);

      } else {

        const issueDef: RawDefinition = {
          team: this.getTeam(issueInfo),
          include: this.isIncluded(issueInfo),
          status: this.getStatus(issueInfo),
          milestone: this.getMilestone(issueInfo),
          kind: this.getKind(issueInfo),
          labels: issueInfo.labels().join("\n"),
          severity: this.getSeverity(issueInfo),
          title: issueInfo.title(),
          link: issueInfo.humanUrl(),
          comments: "",
          assignee: this.getAssignee(issueInfo),
          state: this.getState(issueInfo),
          created: issueInfo.getCreated(),
          updated: issueInfo.getUpdated(),
          closed: issueInfo.getClosed(),

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

  public isIncluded(issueInfo: IssueInfo): boolean {
    return this.getKind(issueInfo) === "epic";
  }

  public getKind(issueInfo: IssueInfo): string {
    if (issueInfo.getKindLabels().length > 0) {
      return issueInfo.getKindLabels()[0].substring("kind/".length);
    } else {
      return "";
    }
  }

  public getSeverity(issueInfo: IssueInfo): string {
    if (issueInfo.getSeverityLabels().length > 0) {
      const severity = issueInfo.getSeverityLabels()[0].substring("severity/".length);
      return severity;
    } else {
      return "";
    }
  }

  public getStatus(issueInfo: IssueInfo): string {
    if (issueInfo.getStatusLabels().length > 0) {
      return issueInfo.getStatusLabels()[0].substring("status/".length);
    } else {
      return "";
    }
  }

  public getAssignee(issueInfo: IssueInfo): string {
    return issueInfo.getAssigneeLogin();
  }

  public getMilestone(issueInfo: IssueInfo): string {
    return issueInfo.milestone();
  }

  public getTeam(issueInfo: IssueInfo): string {

    // first search if there is an assigned team
    let foundTeams: string[] = [];
    const teamLabels = issueInfo.geTeamLabels();
    teamLabels.forEach((label) => {
      if (label.startsWith("team/")) {
        foundTeams.push(label.substring("team/".length));
      }
    });

    // team/languages is mapped to team/plugin
    foundTeams = foundTeams.map(label => {
      if (label === 'languages') {
        return 'plugins';
      } else if (label === 'rhche-qe') {
        return 'hosted-che';
      } else {
        return label;
      }
    });

    if (foundTeams.length === 1) {
      return foundTeams[0];
    } else if (foundTeams.length > 1) {
      return `${foundTeams.join(",")}`;
    }

    const areasTeams = new Map();

    areasTeams.set("area/hosted-che", "hosted-che");
    areasTeams.set("area/telemetry", "hosted-che");
    areasTeams.set("area/image-puller", "hosted-che");
    areasTeams.set("area/getting-started", "hosted-che");

    areasTeams.set("area/devfile", "platform");
    areasTeams.set("area/wsmaster", "platform");
    areasTeams.set("area/factories", "platform");
    areasTeams.set("area/factory/server", "platform");
    areasTeams.set("area/security", "platform");
    areasTeams.set("area/teams", "platform");
    areasTeams.set("area/workspace-sharing", "platform");
    areasTeams.set("area/jwt-proxy", "platform");

    areasTeams.set("area/cli", "deploy");
    areasTeams.set("area/chectl", "deploy");
    areasTeams.set("area/operator", "deploy");
    areasTeams.set("area/install", "deploy");
    areasTeams.set("area/machine-exec", "deploy");

    areasTeams.set("area/productization", "productization");
    areasTeams.set("area/ci", "productization");
    areasTeams.set("area/whitelabel", "productization");

    areasTeams.set("area/dashboard", "controller");
    areasTeams.set("area/plugin-broker", "controller");
    areasTeams.set("area/dev-workspace", "controller");
    areasTeams.set("area/infra/kubernetes", "controller");
    areasTeams.set("area/infra/openshift", "controller");
    areasTeams.set("area/ts-workspace-client", "controller");
    areasTeams.set("area/workspace-client-lib", "controller");
    areasTeams.set("area/workspace-loader", "controller");
    areasTeams.set("area/cloudshell", "controller");
    
    
    areasTeams.set("area/debugger", "plugins");
    areasTeams.set("area/devfile-registry", "plugins");
    areasTeams.set("area/languages", "plugins");
    areasTeams.set("area/lsp-support", "plugins");
    areasTeams.set("area/samples", "plugins");
    areasTeams.set("area/stacks", "plugins");
    areasTeams.set("area/plugin-port", "plugins");
    areasTeams.set("area/plugin-registry", "plugins");
    areasTeams.set("area/plugins", "plugins");
    areasTeams.set("area/git", "plugins");
    areasTeams.set("area/pr-panel", "plugins");

    areasTeams.set("area/che-theia", "editors");

    areasTeams.set("area/dev-experience", "devex");

    areasTeams.set("area/doc", "documentation");

    areasTeams.set("area/qe", "qe");


    const matchingTeams: string[] = [];
    // get areas label
    const areaLabels = issueInfo.getAreaLabels();
    areaLabels.forEach((label) => {
      const team = areasTeams.get(label);
      if (team && !matchingTeams.includes(team)) {
        matchingTeams.push(team);
      }
    });

    matchingTeams.sort();

    if (matchingTeams.length === 0) {
      return "";
    } else if (matchingTeams.length === 1) {
      return matchingTeams[0];
    } else {
      return `${matchingTeams.join(",")}`;
    }

  }

  public getState(issueInfo: IssueInfo): string {
    if (issueInfo.isOpen()) {
      return "open";
    } else {
      return "closed";
    }
  }

}
