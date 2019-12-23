import * as Octokit from "@octokit/rest";
import { Authentication } from "./spreadsheet/authentication";
import { DropDownInitializer } from "./spreadsheet/drop-down-initializer";
import { GithubImport } from "./spreadsheet/github-import";
import { GoogleSheet } from "./spreadsheet/google-sheet";
import { JiraImport } from "./spreadsheet/jira-import";
import { RowUpdater } from "./spreadsheet/row-updater";
import { TeamBacklogGenerator } from "./spreadsheet/team-backlog-generator";
import { ValidationUpdater } from "./spreadsheet/validation-updater";

const githubReadToken: string = process.env.HUBOT_GITHUB_TOKEN || "";
if ("" === githubReadToken) {
  throw new Error("Unable to start as HUBOT_GITHUB_TOKEN is missing");
}
const githubRead: Octokit = new Octokit({ auth: `token ${githubReadToken}` });

const githubPushToken: string = process.env.HUBOT_GITHUB_PUSH_TOKEN || "";
if ("" === githubPushToken) {
  throw new Error("Unable to start as HUBOT_GITHUB_PUSH_TOKEN is missing");
}

const jiraToken: string = process.env.REDHAT_JIRA_TOKEN || "";
if ("" === githubPushToken) {
  throw new Error("Unable to start as REDHAT_JIRA_TOKEN is missing");
}

const githubPush: Octokit = new Octokit({ auth: `token ${githubPushToken}` });

const init = async function() {
  const auth = await new Authentication().init();
  const googleSheet = new GoogleSheet(auth, "1GX_KLUFmgzweqjUckXaNOTK7WZrScyv8UHoVw8tgeas");
  const dropDownInitializer = new DropDownInitializer(googleSheet, "internal-dropdown");

  // header
  const header = await googleSheet.getHeader(GoogleSheet.SHEET_NAME);
  const rowUpdater = new RowUpdater(header);

  // compute dropDown definition
  await dropDownInitializer.init();

  // now, perform the github import
  await new GithubImport(githubRead, googleSheet, rowUpdater).import();
  await new JiraImport(jiraToken, googleSheet, rowUpdater).import();

  // now, apply validation
  const updateValidation = new ValidationUpdater(googleSheet, dropDownInitializer);
  await updateValidation.update();

  // generate sheet data for each team
  await new TeamBacklogGenerator(googleSheet, rowUpdater, dropDownInitializer).import();

};

init().catch((err) => { console.error("Error: ", err); });
