export class ValidationProducer {

  constructor(
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
}
