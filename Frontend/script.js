const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const removeFile = document.getElementById("removeFile");
const summarizeButton = document.getElementById("summarizeButton");
const summaryLength = document.getElementById("summaryLength");
const lengthOptions = document.querySelectorAll(".length-option");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("resultSection");
const downloadButton = document.getElementById("downloadButton");
const newDocumentButton = document.getElementById("newDocumentButton");
const summaryResult = document.getElementById("summaryResult");
const keyPoints = document.getElementById("keyPoints");
const mainIdeas = document.getElementById("mainIdeas");
const suggestions = document.getElementById("suggestions");
const copySummaryButton = document.getElementById("copySummaryButton");

let selectedFile = null;

lengthOptions.forEach(function (option) {

    option.addEventListener("click", function () {

        lengthOptions.forEach(function (item) {
            item.classList.remove("active");
        });

        option.classList.add("active");

        summaryLength.value = option.dataset.length;
    });

});

fileInput.addEventListener("change", function () {
    if (fileInput.files.length > 0) {
        selectFile(fileInput.files[0]);
    }
});

dropZone.addEventListener("dragover", function (event) {
    event.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    if (event.dataTransfer.files.length > 0) {
        selectFile(event.dataTransfer.files[0]);
    }
});

function selectFile(file) {

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg"
    ];

    if (!allowedTypes.includes(file.type)) {
        showError("Please select a PDF, JPG, JPEG, or PNG file.");
        return;
    }

    selectedFile = file;

    fileName.textContent = "📄 " + file.name;
    fileInfo.classList.remove("hidden");
    summarizeButton.disabled = false;

    hideError();
}

removeFile.addEventListener("click", function () {

    selectedFile = null;
    fileInput.value = "";

    fileInfo.classList.add("hidden");
    summarizeButton.disabled = true;
    resultSection.classList.add("hidden");
});

summarizeButton.addEventListener("click", async function () {

    if (!selectedFile) {
        showError("Please select a document first.");
        return;
    }

    const formData = new FormData();

    formData.append("file", selectedFile);

    const length = summaryLength.value;

    setLoading(true);
    hideError();
    resultSection.classList.add("hidden");

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/process?length=" + length,
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Failed to process document."
            );
        }

        displayResults(data.summary);

    } catch (error) {

        showError(error.message);

    } finally {

        setLoading(false);
    }
});

function displayResults(result) {

    const sections = parseResult(result);

    summaryResult.innerHTML = formatText(sections.summary);
    keyPoints.innerHTML = formatText(sections.keyPoints);
    mainIdeas.innerHTML = formatText(sections.mainIdeas);
    suggestions.innerHTML = formatText(sections.suggestions);

    resultSection.classList.remove("hidden");

    resultSection.scrollIntoView({
        behavior: "smooth"
    });
}

function parseResult(result) {

    const sections = {
        summary: "",
        keyPoints: "",
        mainIdeas: "",
        suggestions: ""
    };

    const summaryMatch = result.match(
        /1\.\s*SUMMARY([\s\S]*?)(?=2\.\s*KEY POINTS|$)/i
    );

    const keyPointsMatch = result.match(
        /2\.\s*KEY POINTS([\s\S]*?)(?=3\.\s*MAIN IDEAS|$)/i
    );

    const mainIdeasMatch = result.match(
        /3\.\s*MAIN IDEAS([\s\S]*?)(?=4\.\s*IMPROVEMENT SUGGESTIONS|$)/i
    );

    const suggestionsMatch = result.match(
        /4\.\s*IMPROVEMENT SUGGESTIONS([\s\S]*)/i
    );

    sections.summary = summaryMatch
        ? summaryMatch[1].trim()
        : result;

    sections.keyPoints = keyPointsMatch
        ? keyPointsMatch[1].trim()
        : "No key points returned.";

    sections.mainIdeas = mainIdeasMatch
        ? mainIdeasMatch[1].trim()
        : "No main ideas returned.";

    sections.suggestions = suggestionsMatch
        ? suggestionsMatch[1].trim()
        : "No improvement suggestions returned.";

    return sections;
}

function formatText(text) {

    return text
        .replace(/^###\s*(.*?)$/gm, "<h3>$1</h3>")
        .replace(/^##\s*(.*?)$/gm, "<h3>$1</h3>")
        .replace(/^#\s*(.*?)$/gm, "<h3>$1</h3>")
        .replace(/^---$/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^\*\s+(.*?)$/gm, "• $1")
        .replace(/\n/g, "<br>");
}

function setLoading(isLoading) {

    if (isLoading) {

        loading.classList.remove("hidden");
        summarizeButton.disabled = true;
        summarizeButton.textContent = "Processing...";

    } else {

        loading.classList.add("hidden");
        summarizeButton.disabled = !selectedFile;
        summarizeButton.textContent = "Generate Summary";
    }
}

function showError(message) {

    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function hideError() {

    errorMessage.classList.add("hidden");
    errorMessage.textContent = "";
}

document.addEventListener("click", function (event) {

    const button = event.target.closest("#downloadButton");

    if (!button) {
        return;
    }

    const summary = document.getElementById("summaryResult").innerText;
    const points = document.getElementById("keyPoints").innerText;
    const ideas = document.getElementById("mainIdeas").innerText;
    const suggestions = document.getElementById("suggestions").innerText;

    const content =
        "DOCUMENT SUMMARY\n\n" +
        "====================\n" +
        "SUMMARY\n" +
        "====================\n\n" +
        summary +
        "\n\n" +
        "====================\n" +
        "KEY POINTS\n" +
        "====================\n\n" +
        points +
        "\n\n" +
        "====================\n" +
        "MAIN IDEAS\n" +
        "====================\n\n" +
        ideas +
        "\n\n" +
        "====================\n" +
        "IMPROVEMENT SUGGESTIONS\n" +
        "====================\n\n" +
        suggestions;

    const blob = new Blob(
        [content],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "document-summary.txt";

    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
});
newDocumentButton.addEventListener("click", function () {
    selectedFile = null;

    fileInput.value = "";

    fileInfo.classList.add("hidden");

    resultSection.classList.add("hidden");

    loading.classList.add("hidden");

    hideError();

    summarizeButton.disabled = true;
    summarizeButton.textContent = "Generate Summary";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
copySummaryButton.addEventListener("click", async function () {

    const text = summaryResult.innerText;

    try {
        await navigator.clipboard.writeText(text);

        copySummaryButton.textContent = "Copied!";

        setTimeout(function () {
            copySummaryButton.textContent = "Copy Summary";
        }, 2000);

    } catch (error) {
        showError("Could not copy the summary.");
    }
});