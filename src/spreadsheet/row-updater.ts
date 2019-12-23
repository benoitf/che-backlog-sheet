import { RawDefinition } from "./raw-definition";

export class RowUpdater {

  public static INCLUDE = "Include";
  public static SIZING = "Sizing";
  public static QE_IMPACT = "QE Impact";
  public static DOC_IMPACT = "DOC Impact";
  public static NEEDED_CRW = "Needed CRW";
  public static MVP_CRW = "MVP (CRW)";
  public static MVP_CHE = "MVP (CHE)";
  public static QUARTER = "Quarter";
  public static TEAM = "Team";
  public static CUSTOMER_CASE = "Customer Case";
  public static STATUS = "Status";
  public static AT_RISK = "At Risk";
  public static KIND = "Kind";
  public static LABELS = "Labels";
  public static SEVERITY = "Severity";
  public static THEME = "Theme";
  public static TITLE = "Title";
  public static LINK = "Link";
  public static COMMENTS = "Comments";
  public static STATE = "State";

  private mapping: Map<string, number>;

  constructor(private header: string[]) {
    // mapping
    this.mapping = new Map();
    this.defineMapping(RowUpdater.INCLUDE);
    this.defineMapping(RowUpdater.SIZING);
    this.defineMapping(RowUpdater.QE_IMPACT);
    this.defineMapping(RowUpdater.DOC_IMPACT);
    this.defineMapping(RowUpdater.NEEDED_CRW);
    this.defineMapping(RowUpdater.MVP_CRW);
    this.defineMapping(RowUpdater.MVP_CHE);
    this.defineMapping(RowUpdater.QUARTER);
    this.defineMapping(RowUpdater.TEAM);
    this.defineMapping(RowUpdater.CUSTOMER_CASE);
    this.defineMapping(RowUpdater.STATUS);
    this.defineMapping(RowUpdater.AT_RISK);
    this.defineMapping(RowUpdater.KIND);
    this.defineMapping(RowUpdater.LABELS);
    this.defineMapping(RowUpdater.SEVERITY);
    this.defineMapping(RowUpdater.THEME);
    this.defineMapping(RowUpdater.TITLE);
    this.defineMapping(RowUpdater.LINK);
    this.defineMapping(RowUpdater.COMMENTS);
    this.defineMapping(RowUpdater.STATE);

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

    if (this.mapping.has(RowUpdater.SIZING)) {
      buildRow[this.mapping.get(RowUpdater.SIZING)!] = rawDefinition.sizing;
    }

    if (this.mapping.has(RowUpdater.QE_IMPACT)) {
      buildRow[this.mapping.get(RowUpdater.QE_IMPACT)!] = `${rawDefinition.qeImpact}`;
    }

    if (this.mapping.has(RowUpdater.DOC_IMPACT)) {
      buildRow[this.mapping.get(RowUpdater.DOC_IMPACT)!] = `${rawDefinition.docImpact}`;
    }

    if (this.mapping.has(RowUpdater.NEEDED_CRW)) {
      buildRow[this.mapping.get(RowUpdater.NEEDED_CRW)!] = `${rawDefinition.neededCRW}`;
    }

    if (this.mapping.has(RowUpdater.MVP_CRW)) {
      buildRow[this.mapping.get(RowUpdater.MVP_CRW)!] = `${rawDefinition.mvpCRW}`;
    }

    if (this.mapping.has(RowUpdater.MVP_CHE)) {
      buildRow[this.mapping.get(RowUpdater.MVP_CHE)!] = `${rawDefinition.mvpCHE}`;
    }

    if (this.mapping.has(RowUpdater.QUARTER)) {
      buildRow[this.mapping.get(RowUpdater.QUARTER)!] = rawDefinition.quarter;
    }

    if (this.mapping.has(RowUpdater.TEAM)) {
      buildRow[this.mapping.get(RowUpdater.TEAM)!] = rawDefinition.team;
    }

    if (this.mapping.has(RowUpdater.CUSTOMER_CASE)) {
      buildRow[this.mapping.get(RowUpdater.CUSTOMER_CASE)!] = rawDefinition.customerCase;
    }

    if (this.mapping.has(RowUpdater.STATUS)) {
      buildRow[this.mapping.get(RowUpdater.STATUS)!] = rawDefinition.status;
    }

    if (this.mapping.has(RowUpdater.AT_RISK)) {
      buildRow[this.mapping.get(RowUpdater.AT_RISK)!] = rawDefinition.atRisk;
    }

    if (this.mapping.has(RowUpdater.KIND)) {
      buildRow[this.mapping.get(RowUpdater.KIND)!] = rawDefinition.kind;
    }

    if (this.mapping.has(RowUpdater.LABELS)) {
      buildRow[this.mapping.get(RowUpdater.LABELS)!] = rawDefinition.labels;
    }
    if (this.mapping.has(RowUpdater.SEVERITY)) {
      buildRow[this.mapping.get(RowUpdater.SEVERITY)!] = rawDefinition.severity;
    }
    if (this.mapping.has(RowUpdater.THEME)) {
      buildRow[this.mapping.get(RowUpdater.THEME)!] = rawDefinition.theme;
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

    return buildRow;

  }

  public getDefinition(row: string[]): RawDefinition {
    return {
      include: (row[this.mapping.get(RowUpdater.INCLUDE)!].toLowerCase() === "true"),
      sizing: row[this.mapping.get(RowUpdater.SIZING)!],
      qeImpact: (row[this.mapping.get(RowUpdater.QE_IMPACT)!].toLowerCase() === "true"),
      docImpact: (row[this.mapping.get(RowUpdater.DOC_IMPACT)!].toLowerCase() === "true"),
      neededCRW: (row[this.mapping.get(RowUpdater.NEEDED_CRW)!].toLowerCase() === "true"),
      mvpCRW: row[this.mapping.get(RowUpdater.MVP_CRW)!],
      mvpCHE: row[this.mapping.get(RowUpdater.MVP_CHE)!],
      quarter: row[this.mapping.get(RowUpdater.QUARTER)!],
      team: row[this.mapping.get(RowUpdater.TEAM)!],
      customerCase: row[this.mapping.get(RowUpdater.CUSTOMER_CASE)!],
      status: row[this.mapping.get(RowUpdater.STATUS)!],
      atRisk: row[this.mapping.get(RowUpdater.AT_RISK)!],
      kind: row[this.mapping.get(RowUpdater.KIND)!],
      labels: row[this.mapping.get(RowUpdater.LABELS)!],
      severity: row[this.mapping.get(RowUpdater.SEVERITY)!],
      theme: row[this.mapping.get(RowUpdater.THEME)!],
      title: row[this.mapping.get(RowUpdater.TITLE)!],
      link: row[this.mapping.get(RowUpdater.LINK)!],
      state: row[this.mapping.get(RowUpdater.STATE)!],
      comments: row[this.mapping.get(RowUpdater.COMMENTS)!],
    };
  }

  public getColumnIndex(key: string): number {
    return this.header.findIndex((data: string) => data.toLowerCase().includes(key.toLowerCase()));
  }

}
