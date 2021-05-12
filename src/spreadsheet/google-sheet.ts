import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";

export class GoogleSheet {

  public static SHEET_NAME = "backlog";
  constructor(private oAuth2Client: OAuth2Client, private id: string) {

  }

  public async getHeader(sheetName: string): Promise<string[]> {

    // first, get raw data at maximum (until AZ)
    const sheetData: any = await this.getData({ range: `${sheetName}!A1:AZ` });
    // grab rows
    const rows = sheetData.values;
    // return the first row
    return rows[0];

  }

  public async getData(options: any): Promise<any> {
    const sheets = google.sheets({ version: "v4" });
    const range = options.range || `${GoogleSheet.SHEET_NAME}!A1:U`;
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        auth: this.oAuth2Client,
        spreadsheetId: this.id,
        range,
      }, (err: any, res: any) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res.data);
        }
      });
    });
  }

  public async appendRow(values: string[][]): Promise<any> {
    return this.appendSheetRow(GoogleSheet.SHEET_NAME, values);
  }

  public async appendSheetRow(sheetName: string, values: string[][]): Promise<any> {
    const sheets = google.sheets({ version: "v4" });
    const resource: any = {
      values,
    };
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.append({
        auth: this.oAuth2Client,
        spreadsheetId: this.id,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        resource,
      } as any, (err: any, res: any) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res.data);
        }
      });
    });

  }

  public async valuesBatchUpdate(data: any[]): Promise<void> {
    /*var data = [
        {
          range: "backlog!A2",   // Update single cell
          values: [
        ["A1"]
          ]
        },
        {
          range: "backlog!B2:B4", // Update a column
          values: [
        ["B1"],["B2"],["B3"]
          ]
        },
        {
          range: "backlog!C2:E2", // Update a row
          values: [
        ["C1","D1","E1"]
          ]
        },
        {
          range: "backlog!F2:H3", // Update a 2d range
          values: [
        ["F1", "F2"],
        ["H1", "H2"]
          ]
        }];
       */

    const request = {
      // The ID of the spreadsheet to update.
      spreadsheetId: this.id,

      resource: {
        // How the input data should be interpreted.
        valueInputOption: "USER_ENTERED",

        // The new values to apply to the spreadsheet.
        data,

      },

      auth: this.oAuth2Client,
    };

    const sheets = google.sheets({ version: "v4" });
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.batchUpdate(request, (err: any, res: any) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res.data);
        }
      });
    });
  }

  public async batchUpdateOneOfRangeRequests(requests: any): Promise<void> {

    // data validation
    const request = {
      spreadsheetId: this.id,
      auth: this.oAuth2Client,
      resource: {
        requests,
      },
    };

    const sheets = google.sheets({ version: "v4" });
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.batchUpdate(request, (err: any, res: any) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res.data);
        }
      });
    });

  }
  public async batchUpdateOneOfRange(range: any, value: string): Promise<void> {

    // data validation
    const request = {
      spreadsheetId: this.id,
      auth: this.oAuth2Client,
      resource: {
        requests: [
          {
            setDataValidation: {
              range,
              rule: {
                condition: {
                  type: "ONE_OF_RANGE",
                  values: [
                    {
                      userEnteredValue: value,
                    },
                  ],
                },
                showCustomUi: true,
              },
            },
          },
        ],
      },
    };

    const sheets = google.sheets({ version: "v4" });
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.batchUpdate(request, (err: any, res: any) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(res.data);
        }
      });
    });

  }

  public getID(): string {
    return this.id;
  }

}
