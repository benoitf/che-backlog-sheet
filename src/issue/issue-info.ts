import {Endpoints} from "@octokit/types";

type IssuesGetResponseData = Endpoints["GET /repos/:owner/:repo/issues/:issue_number"]["response"]["data"];

/**
 * Info is a high level of the underlying data associated to an issue.
 */
export class IssueInfo {


  private issueData: IssuesGetResponseData;
  private repoName: string;

  constructor(issueData: IssuesGetResponseData, repoName: string) {
    this.issueData = issueData;
    this.repoName = repoName;
  }

  public repositoryName(): string {
    return this.repoName;
  }

  public title(): string {
    return this.issueData.title;
  }

  public number(): number {
    return this.issueData.number;
  }

  // labels
  public labels(): string[] {
    const labels: string[] = [];
    if (this.issueData.labels) {
      this.issueData.labels.forEach((label: any) => {
        labels.push(label.name);
      });
    }
    return labels;
  }

  public humanUrl(): string {
    return this.issueData.html_url;
  }

  public getAssigneeLogin(): string {
    if (this.issueData.assignee && this.issueData.assignee != null) {
      return this.issueData.assignee.login;
    }
    return '';
  }

  public milestone(): string {
    // milestone
    let milestone: string;
    if (this.issueData.milestone) {
      milestone = this.issueData.milestone.title;
    } else {
      milestone = "";
    }
    return milestone;
  }

  public hasMatchingLabel(labelName: string): boolean {
    let labelFound: boolean = false;

    this.labels().forEach((label) => {
      if (label.lastIndexOf(labelName + "/") === 0) {
        labelFound = true;
      }
    });
    return labelFound;

  }

  public hasLabel(labelName: string): boolean {
    return this.labels().indexOf(labelName) > -1;
  }

  public getLabels(labelNamePrefix: string): string[] {
    const matchingLabels: string[] = [];
    this.labels().forEach((label) => {
      if (label.lastIndexOf(labelNamePrefix + "/") === 0) {
        matchingLabels.push(label);
      }
    });
    return matchingLabels;

  }

  public getKindLabels(): string[] {
    return this.getLabels("kind");
  }

  public getSeverityLabels(): string[] {
    return this.getLabels("severity");
  }

  public getStatusLabels(): string[] {
    return this.getLabels("status");
  }

  public getAreaLabels(): string[] {
    return this.getLabels("area");
  }
  public geTeamLabels(): string[] {
    return this.getLabels("team");
  }

  public hasStatus(): boolean {
    return this.hasMatchingLabel("status");
  }

  public hasSeverity(): boolean {
    return this.hasMatchingLabel("severity");
  }

  public hasKind(): boolean {
    return this.hasMatchingLabel("kind");

  }

  public isTargetBranch(): boolean {
    return this.labels().indexOf("target/branch") > -1;
  }

  public isClosed(): boolean {
    return this.issueData.state === "closed";
  }

  public getCreated(): string {
    const date = new Date(this.issueData.created_at).getTime();
    return `${date}`;
  }

  public getUpdated(): string {
    const date = new Date(this.issueData.updated_at).getTime();
    return `${date}`;
  }

  public getClosed(): string {
    if (this.issueData.closed_at) {
      const date = new Date(this.issueData.closed_at!).getTime();
      return `${date}`;
    } else {
      return '';
    }
  }

  public isOpen(): boolean {
    return this.issueData.state === "open";
  }

  public isPullRequest(): boolean {
    return !!this.issueData.pull_request;
  }

}
