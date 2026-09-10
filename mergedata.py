### Merged all the sheets of text_data.xlsx to one sheet and named as merged_text_dataset.xlsx

import pandas as pd

def merge_excel_sheets(input_path: str, output_path: str, output_sheet_name: str = "merged"):
    # Read every sheet into a dict of {sheet_name: DataFrame}
    all_sheets = pd.read_excel(input_path, sheet_name=None)

    merged_frames = []
    for sheet_name, df in all_sheets.items():
        # Drop fully empty columns/rows that some sheets carry as blank trailing cells
        df = df.dropna(axis=1, how="all")
        df = df.dropna(axis=0, how="all")
        merged_frames.append(df)

    # Combine all sheets, aligning columns by name (fills missing values with NaN)
    merged_df = pd.concat(merged_frames, ignore_index=True, sort=False)

    # Write the merged result to a new Excel file, single sheet
    merged_df.to_excel(output_path, sheet_name=output_sheet_name, index=False)
    print(f"Merged {len(all_sheets)} sheets -> {len(merged_df)} rows into '{output_sheet_name}' sheet of {output_path}")

if __name__ == "__main__":
    merge_excel_sheets("text_data.xlsx", "merged_text_dataset.xlsx")