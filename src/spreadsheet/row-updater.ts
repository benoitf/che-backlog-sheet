import { RawDefinition } from "./raw-definition";

export class RowUpdater {

  public static INCLUDE = "Include";
  public static MILESTONE = "Milestone";
  public static TEAM = "Team";
  public static STATUS = "Status";
  public static KIND = "Kind";
  public static SEVERITY = "Severity";
  public static TITLE = "Title";
  public static LINK = "Link";
  public static COMMENTS = "Comments";
  public static STATE = "State";
  public static LABELS = "Labels";
  public static ASSIGNEE = "Assignee";
  public static CREATED = "Created";
  public static UPDATED = "Updated";
  public static CLOSED = "Closed";

  private mapping: Map<string, number>;

  constructor(private header: string[]) {
    // mapping
    this.mapping = new Map();
    this.defineMapping(RowUpdater.INCLUDE);
    this.defineMapping(RowUpdater.MILESTONE);
    this.defineMapping(RowUpdater.TEAM);
    this.defineMapping(RowUpdater.STATUS);
    this.defineMapping(RowUpdater.KIND);
    this.defineMapping(RowUpdater.SEVERITY);
    this.defineMapping(RowUpdater.TITLE);
    this.defineMapping(RowUpdater.LINK);
    this.defineMapping(RowUpdater.COMMENTS);
    this.defineMapping(RowUpdater.STATE);
    this.defineMapping(RowUpdater.LABELS);
    this.defineMapping(RowUpdater.ASSIGNEE);
    this.defineMapping(RowUpdater.CREATED);
    this.defineMapping(RowUpdater.UPDATED);
    this.defineMapping(RowUpdater.CLOSED);
  }

  public defineMapping(key: string) {
    this.mapping.set(key, this.getColumnIndex(key));
  }

  public getRow(rawDefinition: RawDefinition): string[] {
    //

    const buildRow = new Array<string>(this.header.length);

    if (this.mapping.has(RowUpdater.INCLUDE)) {
      buildRow[this.mapping.get(RowUpdater.INCLUDE)!] = `${rawDefinition.include}`;
    }

    if (this.mapping.has(RowUpdater.MILESTONE)) {
      buildRow[this.mapping.get(RowUpdater.MILESTONE)!] = rawDefinition.milestone;
    }

    if (this.mapping.has(RowUpdater.TEAM)) {
      buildRow[this.mapping.get(RowUpdater.TEAM)!] = rawDefinition.team;
    }

    if (this.mapping.has(RowUpdater.STATUS)) {
      buildRow[this.mapping.get(RowUpdater.STATUS)!] = rawDefinition.status;
    }

    if (this.mapping.has(RowUpdater.KIND)) {
      buildRow[this.mapping.get(RowUpdater.KIND)!] = rawDefinition.kind;
    }

    if (this.mapping.has(RowUpdater.SEVERITY)) {
      buildRow[this.mapping.get(RowUpdater.SEVERITY)!] = rawDefinition.severity;
    }

    if (this.mapping.has(RowUpdater.TITLE)) {
      buildRow[this.mapping.get(RowUpdater.TITLE)!] = rawDefinition.title;
    }
    if (this.mapping.has(RowUpdater.LINK)) {
      buildRow[this.mapping.get(RowUpdater.LINK)!] = rawDefinition.link;
    }
    if (this.mapping.has(RowUpdater.COMMENTS)) {
      buildRow[this.mapping.get(RowUpdater.COMMENTS)!] = rawDefinition.comments;
    }
    if (this.mapping.has(RowUpdater.STATE)) {
      buildRow[this.mapping.get(RowUpdater.STATE)!] = rawDefinition.state;
    }

    if (this.mapping.has(RowUpdater.LABELS)) {
      buildRow[this.mapping.get(RowUpdater.LABELS)!] = rawDefinition.labels;
    }

    if (this.mapping.has(RowUpdater.ASSIGNEE)) {
      buildRow[this.mapping.get(RowUpdater.ASSIGNEE)!] = rawDefinition.assignee;
    }

    if (this.mapping.has(RowUpdater.CREATED)) {
      buildRow[this.mapping.get(RowUpdater.CREATED)!] = rawDefinition.created;
    }
    if (this.mapping.has(RowUpdater.UPDATED)) {
      buildRow[this.mapping.get(RowUpdater.UPDATED)!] = rawDefinition.updated;
    }
    if (this.mapping.has(RowUpdater.CLOSED)) {
      buildRow[this.mapping.get(RowUpdater.CLOSED)!] = rawDefinition.closed;
    }

    return buildRow;

  }

  public getDefinition(row: string[]): RawDefinition {
    return {
      include: (row[this.mapping.get(RowUpdater.INCLUDE)!].toLowerCase() === "true"),
      milestone: row[this.mapping.get(RowUpdater.MILESTONE)!],
      team: row[this.mapping.get(RowUpdater.TEAM)!],
      status: row[this.mapping.get(RowUpdater.STATUS)!],
      kind: row[this.mapping.get(RowUpdater.KIND)!],
      severity: row[this.mapping.get(RowUpdater.SEVERITY)!],
      title: row[this.mapping.get(RowUpdater.TITLE)!],
      link: row[this.mapping.get(RowUpdater.LINK)!],
      comments: row[this.mapping.get(RowUpdater.COMMENTS)!],
      state: row[this.mapping.get(RowUpdater.STATE)!],
      assignee: row[this.mapping.get(RowUpdater.ASSIGNEE)!],
      labels: row[this.mapping.get(RowUpdater.LABELS)!],
      created: row[this.mapping.get(RowUpdater.CREATED)!],
      updated: row[this.mapping.get(RowUpdater.UPDATED)!],
      closed: row[this.mapping.get(RowUpdater.CLOSED)!],
    };
  }

  public getColumnIndex(key: string): number {
    return this.header.findIndex((data: string) => data.toLowerCase().includes(key.toLowerCase()));
  }

}
