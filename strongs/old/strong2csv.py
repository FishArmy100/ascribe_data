"""
A utility to extract Strong's Numbers data into a CSV file.
Can enter one or more numbers, i.e. H25 or H356,G217,G875. Saved file will 
be named after the (first) Strong's Number entered, i.e. "H25.csv."
"""

import os
import codecs
import re
import sys
import sqlite3 as sqlite
import strongsData
import getopt
from typing import List, Optional

helpTxt = """
    Enter one or more comma separated Strong's numbers, 
    i.e. H25 or H356,G217,G875. 
    Saved file will be named after the (first) Strong's Number entered, i.e. "H25.csv."
"""


def parseArgs(argv: List[str]) -> None:
    """Parse command line arguments and process Strong's numbers."""
    
    # Options
    options = "ho:"
    # Long options
    long_options = ["Help", "Output="]
    
    output_path: Optional[str] = None
    
    try:
        opts, args = getopt.getopt(argv, options, long_options)
        
        # Process options
        for opt, arg in opts:
            if opt in ('-h', '--Help'):
                print(helpTxt)
                sys.exit(0)
            elif opt in ('-o', '--Output'):
                output_path = arg
        
        # Process arguments
        if not args:
            print("Error: No Strong's numbers provided")
            print('Usage: makeCSV.py <strongs number(s)> [-h] [-o outputpath]')
            sys.exit(2)
        
        # Handle comma-separated numbers in a single argument or multiple arguments
        all_numbers: list[str] = []
        for arg in args:
            if ',' in arg:
                all_numbers.extend([num.strip() for num in arg.split(',')])
            else:
                all_numbers.append(arg.strip())
        
        # Validate and format Strong's numbers
        formatted_numbers: list[str] = []
        for num in all_numbers:
            # Remove brackets if present and validate format
            clean_num = num.strip('[]')
            if re.match(r'^[HG]\d+$', clean_num):
                formatted_numbers.append(f'[{clean_num}]')
            else:
                print(f"Warning: Invalid Strong's number format: {num}")
        
        if not formatted_numbers:
            print("Error: No valid Strong's numbers found")
            sys.exit(2)
        
        generate(formatted_numbers, output_path)
        
    except getopt.GetoptError as e:
        print(f'Error: {e}')
        print('Usage: makeCSV.py <strongs number(s)> [-h] [-o outputpath]')
        sys.exit(2)


def generate(sNumList: List[str], output_path: Optional[str] = None) -> None:
    """Generate CSV file with Strong's numbers data."""
    
    fn = 'av1769s.bib'
    
    if not os.path.exists(fn):
        print(f"Error: Database file '{fn}' not found")
        sys.exit(1)
    
    # Prepare CSV output
    csv_lines = ['Idx,Book,Ref.,KJB Verse,KJB Word,Original,Transliteration,Definition']
    
    # Determine output filename
    first_number = sNumList[0].strip('[]')
    if output_path:
        csv_filename = os.path.join(output_path, f'{first_number}.csv')
    else:
        csv_filename = f'{first_number}.csv'
    
    try:
        con = sqlite.connect(fn)
        cur = con.cursor()
        cur.execute('SELECT * FROM bible')
        
        idx = 1
        
        for row in cur:
            if len(row) < 3:
                continue
                
            vs_txt = str(row[2]) if row[2] else ""
            
            # Check if any of our target Strong's numbers are in this verse
            if any(sn in vs_txt for sn in sNumList):
                # Clean up the verse text
                vs_txt_clean = re.sub(r'\[\([HG]\d+\)\]', '', vs_txt)
                vs_txt_clean = re.sub(r'\[\([GH]\d+\)\]|<fn>\d+</fn>|<.+?>|[\r\n]', '', vs_txt_clean)
                
                # Find word groups with Strong's numbers
                wd_grp_list = re.findall(r'[^\]]+\]', vs_txt_clean)
                
                wd_list: list[str] = []
                ow_list: list[str] = []
                trans_list: list[str] = []
                def_list: list[str] = []
                wd_grp_list_fix: list[str] = []
                
                for wd_grp in wd_grp_list:
                    if any(sn in wd_grp for sn in sNumList):
                        # This word group contains one of our target Strong's numbers
                        parts = wd_grp.split('[')
                        if len(parts) >= 2:
                            wds = parts[0]
                            sns = parts[1].rstrip(']')
                            
                            # Mark this word group
                            wd_grp = re.sub(r'(\W?\s?)(.+)', r'\1**\2**', wd_grp)
                            
                            # Extract word
                            clean_word = re.sub(r'[^\w\s]', '', wds).strip()
                            if clean_word:
                                wd_list.append(clean_word)
                            
                            # Get Strong's data
                            try:
                                if sns in strongsData.strongsData:
                                    data = strongsData.strongsData[sns]
                                    
                                    ow = f'{sns} {data[0]}'
                                    if ow not in ow_list:
                                        ow_list.append(ow)
                                    if data[1] not in trans_list:
                                        trans_list.append(data[1])
                                    if data[2] not in def_list:
                                        def_list.append(data[2])
                            except (KeyError, IndexError) as e:
                                print(f"Warning: Strong's number {sns} not found in data")
                    else:
                        # Remove Strong's numbers from non-matching words
                        wd_grp = re.sub(r'\[[GH]\d+\]', '', wd_grp)
                    
                    wd_grp_list_fix.append(wd_grp)
                
                vs_txt_fix = ''.join(wd_grp_list_fix)
                
                # Extract book and reference
                ref_parts = str(row[1]).split() if row[1] else ["", ""]
                bk = ref_parts[0] if ref_parts else ""
                
                # Create CSV line with proper escaping
                line_data = [
                    str(idx),
                    bk,
                    str(row[1]) if row[1] else "",
                    vs_txt_fix,
                    ', '.join(wd_list),
                    ', '.join(ow_list),
                    ', '.join(trans_list),
                    ', '.join(def_list)
                ]
                
                # Properly escape CSV fields
                escaped_fields: list[str] = []
                for field in line_data:
                    if '"' in field:
                        field = field.replace('"', '""')
                    escaped_fields.append(f'"{field}"')
                
                csv_lines.append(','.join(escaped_fields))
                idx += 1
        
        con.close()
        
        # Write CSV file
        with codecs.open(csv_filename, 'w', 'utf-8') as csvout:
            csvout.write('\n'.join(csv_lines))
        
        print(f'CSV Generated: {csv_filename}')
        print(f'Total entries: {idx - 1}')
        
    except sqlite.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except IOError as e:
        print(f"File I/O error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


def main() -> None:
    """Main entry point."""
    if len(sys.argv) > 1:
        parseArgs(sys.argv[1:])
    else:
        print("Enter at least one Strong's Number (i.e. G25) or -h for help: ")
        
        user_input = input().strip()
        if not user_input or user_input == '-h':
            print(helpTxt)
            sys.exit(0)
        else:
            parseArgs([user_input])


if __name__ == "__main__":
    main()