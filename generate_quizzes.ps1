# Configuration
$styleCss = "style.css"
$scriptJs = "script.js"
$questionsDir = "questions"
$outputPrefix = "flutter_quiz"
$globalQuizIndex = 1

# Mappings for Chapters
$chapterMap = @{
    "Chapter01_Q1_Q50.txt" = "Chapter 1: The Foundation"
    "Chapter02_50Q.txt"    = "Chapter 2: Dart Basics"
    "Chapter3_Q40.txt"     = "Chapter 3: Layouts & Widgets"
    "Chapter04_100Q .txt"  = "Chapter 4: State Management"
    "Chapter05_100Q.txt"   = "Chapter 5: Navigation & Routing"
    "Chapter06_60Q.txt"    = "Chapter 6: Networking & Data"
    "Gradle_MCQ_Q40.txt"   = "Appendix: Gradle Build System"
    "Material_MCQs_50.txt" = "Appendix: Material Design"
    "ThemeData_40Q.txt"    = "Appendix: Theming & Styling"
}

# Helper to escape JSON
function Escape-Json($str) {
    return $str -replace "\\", "\\" -replace '"', '\"'
}

# Helper to get letter index
function Get-Letter-Index($letter) {
    switch ($letter.Trim()) {
        "A" { return 0 }
        "B" { return 1 }
        "C" { return 2 }
        "D" { return 3 }
        Default { return 0 }
    }
}

# Collect all dashboard HTML segments
$dashboardSections = @()

# Process each file in specific order if possible, or just sort
$files = Get-ChildItem "$questionsDir\*.txt" | Sort-Object Name

# Custom sort order to match chapter numbers roughly
$orderedFiles = $files | Sort-Object { 
    if ($_.Name -match "Chapter0?(\d+)") { return [int]$matches[1] } 
    return 999 
}

foreach ($file in $orderedFiles) {
    Write-Host "Processing $($file.Name)..."
    $content = Get-Content $file.FullName -Raw
    
    # Parse Questions
    $questions = @()
    $currentQ = $null
    
    # Regex split roughly or line by line
    $lines = $content -split "`r`n|`n"
    
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        if ($line -match "^Q\d+\.\s*(.+)") {
            if ($currentQ) { $questions += $currentQ }
            $currentQ = @{
                question = $matches[1]
                options  = @()
                answer   = 0
            }
        }
        elseif ($line -match "^([A-D])\.\s*(.+)") {
            if ($currentQ) {
                $currentQ.options += $matches[2]
            }
        }
        elseif ($line -match "^Correct Answer:\s*([A-D])") {
            if ($currentQ) {
                $currentQ.answer = Get-Letter-Index $matches[1]
            }
        }
    }
    if ($currentQ) { $questions += $currentQ }
    
    $totalQs = $questions.Count
    if ($totalQs -eq 0) { continue }
    
    # Logic: Divide equally, max 30
    $maxPerQuiz = 30
    $numChunks = [math]::Ceiling($totalQs / $maxPerQuiz)
    $chunkSize = [math]::Ceiling($totalQs / $numChunks)
    
    Write-Host "  -> Found $totalQs questions. Splitting into $numChunks quizzes (~$chunkSize each)."
    
    $chapterTitle = $chapterMap[$file.Name]
    if (-not $chapterTitle) { $chapterTitle = $file.BaseName }
    
    # Dashboard Section Header
    $dashboardSections += "<section class='quiz-section'><h2 class='section-title'>$chapterTitle</h2><div class='grid'>"
    
    for ($i = 0; $i -lt $numChunks; $i++) {
        $start = $i * $chunkSize
        $count = $chunkSize
        
        # Adjust last chunk
        if (($start + $count) -gt $totalQs) { $count = $totalQs - $start }
        if ($count -le 0) { break }
        
        $chunkQs = $questions[$start..($start + $count - 1)]
        
        # Generate HTML
        $quizNum = $globalQuizIndex
        $fileName = "$outputPrefix$quizNum.html"
        
        # Build JSON Data
        $jsonParts = @()
        foreach ($q in $chunkQs) {
            $opts = $q.options | ForEach-Object { "`"$(Escape-Json $_)`"" }
            $optsStr = $opts -join ", "
            $qJson = "{ question: `"$($q.question)`", options: [$optsStr], answerIndex: $($q.answer) }"
            $jsonParts += $qJson
        }
        $jsonArray = "[$($jsonParts -join ',')]"
        
        $htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flutter Quiz $quizNum | ET-Study</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <link rel="stylesheet" href="style.css">
    <style>
         /* Flutter Theme Override */
         :root {
            --accent-gradient: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
            --accent-primary: #0ea5e9;
            --accent-secondary: #3b82f6;
         }
         .quiz-header { background: var(--bg-dark); }
         .card:hover { border-color: rgba(59, 130, 246, 0.3); }
    </style>
</head>
<body>
    <div id="quiz-container">
        <div id="progress-bar-container"><div id="progress-bar"></div></div>
        <div class="quiz-header">
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">$chapterTitle</div>
            <h1>Flutter Quiz $quizNum</h1>
        </div>
        <div id="card-container"></div>
        <div id="results-container" class="hidden"></div>
        <div id="navigation">
            <button id="prev-btn" class="nav-btn secondary">Previous</button>
            <button id="next-btn" class="nav-btn">Next</button>
            <button id="finish-btn" class="nav-btn hidden">Finish Quiz</button>
        </div>
    </div>

    <script>
        window.quizData = $jsonArray;
    </script>
    <script src="script.js"></script>
</body>
</html>
"@
        Set-Content -Path $fileName -Value $htmlContent -Encoding UTF8
        
        # Dashboard Card
        $cardTitle = "Flutter Quiz $quizNum"
        $cardDesc = "Part $($i + 1) of $chapterTitle"
        
        $dashboardSections += @"
            <a href='$fileName' class='card'>
                <div class='card-number'>$($quizNum.ToString("00"))</div>
                <div class='card-content'>
                    <div class='card-title'>$cardTitle</div>
                    <div class='card-desc'>$cardDesc</div>
                    <div class='card-arrow'>Start Quiz &rarr;</div>
                </div>
            </a>
"@
        $globalQuizIndex++
    }
    
    $dashboardSections += "</div></section>"
}

# Update flutter.html
$flutterHtml = Get-Content "flutter.html" -Raw
$newMainContent = "<main>`n" + ($dashboardSections -join "`n") + "`n</main>"
$flutterHtmlRegex = "(?s)<main>(.*?)</main>"
$updatedFlutterHtml = $flutterHtml -replace $flutterHtmlRegex, $newMainContent
Set-Content "flutter.html" -Value $updatedFlutterHtml -Encoding UTF8
Write-Host "Done! Generated $($globalQuizIndex - 1) quizzes."
