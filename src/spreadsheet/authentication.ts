import * as fs from "fs-extra";
import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import * as readline from "readline";

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

export class Authentication {

  private oAuth2Client: OAuth2Client | undefined;

  public async init(): Promise<OAuth2Client> {
    // Load client secrets from a local file.
    const content = await fs.readFile("credentials.json");
    // Authorize a client with credentials, then call the Google Sheets API.
    await this.authorize(JSON.parse(content.toString()));

    return this.oAuth2Client!;
  }

  /**
   */
  public async authorize(credentials: any): Promise<void> {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    this.oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    try {
      const token = await fs.readFile(TOKEN_PATH);
      this.oAuth2Client.setCredentials(JSON.parse(token.toString()));
    } catch (error) {
      await this.getNewToken();
    }
  }

  /**
  * Get and store new token after prompting for user authorization, and then
  * execute the given callback with the authorized OAuth2 client.
  * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
  * @param {getEventsCallback} callback The callback for the authorized client.
  */
  public async getNewToken(): Promise<void> {
    const authUrl = this.oAuth2Client!.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve: any, reject: any) => {
      rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        this.oAuth2Client!.getToken(code, async (err: any, token: any) => {
          if (err) {
            reject("Error while trying to retrieve access token", err);
          }
          this.oAuth2Client!.setCredentials(token);
          // Store the token to disk for later program executions
          await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
          console.log("Token stored to", TOKEN_PATH);
          resolve();
        });
      });
    });
  }

}
