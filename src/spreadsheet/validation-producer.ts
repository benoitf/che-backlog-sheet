import { DropDownInitializer } from "./drop-down-initializer";

export class ValidationProducer {

  constructor(
    private dropDownInitializer: DropDownInitializer,
    private sheetId: number,
  ) {

  }

  public getCheckBoxRequest(endRowIndex: number, header: string[], columnName: string) {
    const columnIndex = header.findIndex((data: string) => data.toLowerCase() === columnName.toLowerCase());

    return {
      repeatCell:
      {
        cell: {
          dataValidation: {
            condition: { type: "BOOLEAN" },
          },
        },
        range: {
          sheetId: this.sheetId,
          startRowIndex: 1,
          endRowIndex,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1,
        },
        fields: "dataValidation",
      },
    };
  }

  public getRangRequest(endRowIndex: number, header: string[], columnName: string) {
    const columnIndex = header.findIndex((data: string) => data.toLowerCase() === columnName);

    return {
      setDataValidation: {
        range: {
          sheetId: this.sheetId,
          startRowIndex: 1,
          endRowIndex,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1,
        },
        rule: {
          condition: {
            type: "ONE_OF_RANGE",
            values: [
              {
                userEnteredValue: this.dropDownInitializer.getRange(columnName),
              },
            ],
          },
          showCustomUi: true,
        },
      },
    };
  }
}
