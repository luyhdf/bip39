function openTab(tabName) {
    var tabContents = document.getElementsByClassName("tab-content");
    for (var i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }

    var tabs = document.getElementsByClassName("tab");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    event.currentTarget.classList.add("active");
}

function generateMnemonic() {
    const wordCount = document.querySelector('input[name="wordCount"]:checked').value;
    const strength = wordCount === "12" ? 128 : 256; // 12词对应128位熵，24词对应256位熵
    
    try {
        // 创建一个临时的 DOM 元素来满足 Mnemonic 类的初始化要求
        const tempContainer = document.createElement('div');
        tempContainer.className = 'entropy-container';
        tempContainer.innerHTML = '<input class="pbkdf2-rounds" value="2048">';
        document.body.appendChild(tempContainer);

        const mnemonic = new Mnemonic("english");
        const words = mnemonic.generate(strength);
        document.getElementById("mnemonicOutput").value = words;

        // 清理临时元素
        document.body.removeChild(tempContainer);
    } catch (error) {
        alert("生成助记词时出错: " + error.message);
    }
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById("mnemonicOutput").value = text;
    } catch (err) {
        alert("无法访问剪贴板，请确保已授予剪贴板访问权限");
        console.error("粘贴失败:", err);
    }
}

// 添加候选单词提示功能
function initWordSuggestions() {
    const textarea = document.getElementById("mnemonicOutput");
    const suggestionsDiv = document.createElement("div");
    suggestionsDiv.className = "suggestions";
    suggestionsDiv.style.display = "none";
    textarea.parentNode.appendChild(suggestionsDiv);

    // 获取提示元素
    const hintDiv = document.querySelector('.hint');

    let currentSuggestionIndex = 0;
    let suggestions = [];

    // 计算光标位置
    function getCursorPosition() {
        const textarea = document.getElementById("mnemonicOutput");
        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
        
        // 创建临时元素来计算位置
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = window.getComputedStyle(textarea).cssText;
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.style.wordWrap = 'break-word';
        document.body.appendChild(tempDiv);
        
        // 获取光标前的文本
        const textBeforeCursor = text.substring(0, cursorPos);
        tempDiv.textContent = textBeforeCursor;
        
        // 计算位置
        const rect = tempDiv.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        
        // 清理临时元素
        document.body.removeChild(tempDiv);
        
        return {
            left: textareaRect.left,
            top: textareaRect.top + textareaRect.height + 5
        };
    }

    // 更新候选词位置
    function updateSuggestionsPosition() {
        const cursorPos = getCursorPosition();
        
        // 设置候选词位置
        suggestionsDiv.style.position = 'fixed';
        suggestionsDiv.style.left = cursorPos.left + 'px';
        suggestionsDiv.style.top = cursorPos.top + 'px';
        
        // 设置提示位置
        hintDiv.style.position = 'fixed';
        hintDiv.style.left = cursorPos.left + 'px';
        hintDiv.style.top = (cursorPos.top + suggestionsDiv.offsetHeight + 5) + 'px';
    }

    function highlightSuggestion(index) {
        // 移除所有高亮
        document.querySelectorAll('.suggestion').forEach(el => {
            el.classList.remove('active');
        });
        // 添加当前高亮
        if (suggestions[index]) {
            suggestions[index].classList.add('active');
        }
    }

    function selectCurrentSuggestion() {
        if (suggestions[currentSuggestionIndex]) {
            const words = textarea.value.split(" ");
            words[words.length - 1] = suggestions[currentSuggestionIndex].textContent;
            textarea.value = words.join(" ") + " ";
            suggestionsDiv.style.display = "none";
            textarea.focus();
        }
    }

    function showInitialSuggestions() {
        // 显示前8个单词作为初始候选
        const initialWords = WORDLISTS["english"].slice(0, 8);
        suggestionsDiv.innerHTML = initialWords.map(word => 
            `<div class="suggestion">${word}</div>`
        ).join("");
        suggestionsDiv.style.display = "flex";
        hintDiv.style.display = "flex";
        
        suggestions = Array.from(document.querySelectorAll('.suggestion'));
        currentSuggestionIndex = 0;
        highlightSuggestion(currentSuggestionIndex);
        
        // 更新位置
        updateSuggestionsPosition();
    }

    function updateSuggestions(currentWord) {
        const matches = WORDLISTS["english"].filter(word => 
            word.toLowerCase().startsWith(currentWord)
        ).slice(0, 8);

        if (matches.length > 0) {
            suggestionsDiv.innerHTML = matches.map(word => 
                `<div class="suggestion">${word}</div>`
            ).join("");
            suggestionsDiv.style.display = "flex";
            hintDiv.style.display = "flex";
            
            suggestions = Array.from(document.querySelectorAll('.suggestion'));
            currentSuggestionIndex = 0;
            highlightSuggestion(currentSuggestionIndex);
            
            // 更新位置
            updateSuggestionsPosition();
        } else {
            // 显示错误提示
            suggestionsDiv.innerHTML = '<div class="error-message">输入单词错误，请检查拼写</div>';
            suggestionsDiv.style.display = "flex";
            hintDiv.style.display = "none";
            
            suggestions = [];
            currentSuggestionIndex = -1;
            
            // 更新位置
            updateSuggestionsPosition();
        }
    }

    // 监听光标位置变化
    textarea.addEventListener("input", function(e) {
        const currentWord = this.value.split(" ").pop().toLowerCase();
        updateSuggestions(currentWord);
        
        // 检查助记词是否完整
        const words = this.value.trim().split(/\s+/);
        const wordCount = document.querySelector('input[name="wordCount"]:checked').value;
        
        const statusDiv = document.getElementById('mnemonicStatus');
        
        if (words.length === parseInt(wordCount)) {
            // 检查助记词是否有效
            try {
                const mnemonic = new Mnemonic("english");
                const isValid = mnemonic.check(words.join(" "));
                
                if (isValid) {
                    statusDiv.className = 'status-message success-message';
                    statusDiv.textContent = '助记词有效';
                } else {
                    statusDiv.className = 'status-message error-message';
                    statusDiv.textContent = '助记词无效';
                }
            } catch (error) {
                statusDiv.className = 'status-message error-message';
                statusDiv.textContent = '助记词无效';
            }
        } else {
            statusDiv.className = 'status-message';
            statusDiv.textContent = `已输入 ${words.length} 个单词，还需要 ${parseInt(wordCount) - words.length} 个单词`;
        }
    });

    textarea.addEventListener("click", function() {
        updateSuggestionsPosition();
    });

    textarea.addEventListener("keyup", function() {
        updateSuggestionsPosition();
    });

    textarea.addEventListener("keydown", function(e) {
        if (suggestionsDiv.style.display === "none") return;

        switch(e.key) {
            case "Tab":
                e.preventDefault(); // 阻止默认的Tab行为
                currentSuggestionIndex = (currentSuggestionIndex + 1) % suggestions.length;
                highlightSuggestion(currentSuggestionIndex);
                break;
            case "Enter":
                e.preventDefault(); // 阻止默认的换行行为
                selectCurrentSuggestion();
                break;
        }
    });

    suggestionsDiv.addEventListener("click", function(e) {
        if (e.target.classList.contains("suggestion")) {
            const words = textarea.value.split(" ");
            words[words.length - 1] = e.target.textContent;
            textarea.value = words.join(" ") + " ";
            suggestionsDiv.style.display = "none";
            textarea.focus();
        }
    });

    document.addEventListener("click", function(e) {
        if (!textarea.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = "none";
        }
    });
}

// 初始化
document.addEventListener("DOMContentLoaded", function() {
    initWordSuggestions();
}); 