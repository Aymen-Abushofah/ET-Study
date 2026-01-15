import re
import json

def parse_quiz_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Normalize newlines
    content = content.replace('\r\n', '\n')

    # Split by "Q" followed by digits and dot, but lookahead to keep the delimiter
    # Actually, simpler is to iterate line by line
    
    questions = []
    current_q = None
    
    lines = content.split('\n')
    
    # Regex for Question start: Q1. ...
    q_pattern = re.compile(r'^Q\d+\.\s+(.*)')
    # Regex for Options: A. ...
    opt_pattern = re.compile(r'^([A-D])\.\s+(.*)')
    # Regex for Answer: Correct Answer: ...
    ans_pattern = re.compile(r'^Correct Answer:\s+([A-D])')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        q_match = q_pattern.match(line)
        opt_match = opt_pattern.match(line)
        ans_match = ans_pattern.match(line)
        
        if q_match:
            if current_q:
                questions.append(current_q)
            current_q = {
                "question": q_match.group(1),
                "options": [],
                "temp_options": {}, # Map 'A' -> index
                "answerIndex": 0
            }
        elif opt_match and current_q is not None:
            letter = opt_match.group(1)
            text = opt_match.group(2)
            current_q["options"].append(text)
            current_q["temp_options"][letter] = len(current_q["options"]) - 1
        elif ans_match and current_q is not None:
            correct_letter = ans_match.group(1)
            if correct_letter in current_q["temp_options"]:
                current_q["answerIndex"] = current_q["temp_options"][correct_letter]
            else:
                # Fallback or error
                current_q["answerIndex"] = 0 

    if current_q:
        questions.append(current_q)
        
    # Clean up temp_options
    for q in questions:
        del q["temp_options"]
        
    return json.dumps(questions, indent=2)

print(parse_quiz_file("d:/HTML Quiz/questions/Chapter01_Q1_Q50.txt"))
