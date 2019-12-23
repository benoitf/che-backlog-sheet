import Octokit = require("@octokit/rest");
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
    const PREVIOUS_DAYS = 4;

    // compute 180 days from now in the past
    const beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() - PREVIOUS_DAYS);
    const simpleDate = beforeDate.toISOString().substring(0, 10);

    // get all opened issues after this date

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

  public async handleIssues(issueData: any): Promise<void> {
    const rawGithubIssuesInfos: IssueInfo[] = issueData.map((issueData: any) => new IssueInfo(issueData, "che"));
    const githubIssuesInfos = rawGithubIssuesInfos.filter((issueInfo) => !issueInfo.hasLabel("kind/question"));

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
    githubIssuesInfos.map((issueInfo) => {
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

        // update row columns
        const update = {
          range: `${GoogleSheet.SHEET_NAME}!A${rowNumber}:U${rowNumber}`,
          values: [this.rowUpdater.getRow(issueDef)],
        };

        batchUpdates.push(update);

      } else {

        const issueDef: RawDefinition = {
          team: this.getTeam(issueInfo),
          sizing: "---",
          include: this.isIncluded(issueInfo),
          qeImpact: false,
          docImpact: false,
          neededCRW: false,
          mvpCRW: "",
          mvpCHE: "",
          quarter: "---",
          customerCase: "",
          status: "---",
          atRisk: "",
          kind: this.getKind(issueInfo),
          labels: issueInfo.labels().join(","),
          severity: this.getSeverity(issueInfo),
          theme: "---",
          title: issueInfo.title(),
          link: issueInfo.humanUrl(),
          comments: "",
          state: this.getState(issueInfo),

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

  public getTeam(issueInfo: IssueInfo): string {

    // first search if there is an assigned team
    const foundTeams: string[] = [];
    const teamLabels = issueInfo.geTeamLabels();
    teamLabels.forEach((label) => {
      if (label.startsWith("team/")) {
        foundTeams.push(label.substring("team/".length));
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
    areasTeams.set("area/security", "platform");
    areasTeams.set("area/wsmaster", "platform");
    areasTeams.set("area/teams", "platform");
    areasTeams.set("area/workspaces/sharing", "platform");
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

    areasTeams.set("area/debugger", "languages");
    areasTeams.set("area/devfile-registry", "languages");
    areasTeams.set("area/languages", "languages");
    areasTeams.set("area/lsp-support", "languages");
    areasTeams.set("area/samples", "languages");
    areasTeams.set("area/stacks", "languages");

    areasTeams.set("area/plugin-registry", "plugins");
    areasTeams.set("area/plugins", "plugins");
    areasTeams.set("area/git", "plugins");
    areasTeams.set("area/pr-panel", "plugins");

    areasTeams.set("area/che-theia", "editors");

    areasTeams.set("area/dev-experience", "devex");

    areasTeams.set("area/doc", "documentation");

    const matchingTeams: string[] = [];
    // get areas label
    const areaLabels = issueInfo.getAreaLabels();
    areaLabels.forEach((label) => {
      const team = areasTeams.get(label);
      if (!matchingTeams.includes(team)) {
        matchingTeams.push(team);
      }
    });

    matchingTeams.sort();

    if (matchingTeams.length === 0) {
      return "---";
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
