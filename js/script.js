// ========================================
// グローバル変数
// ========================================
let charactersData = null; // JSONから読み込んだデータ
const MAX_SUB_LEVEL = 6; // サブ素質の最大レベル（アップデートで変更可能）
const MAX_CORE_POTENTIALS = 2; // コア素質の最大取得数

// 素質の定義（全キャラ共通）
const POTENTIAL_DEFINITIONS = {
    main: {
        core: ['mc1', 'mc2', 'mc3', 'mc4'],
        sub: ['ms1', 'ms2', 'ms3', 'ms4', 'ms5', 'ms6', 
              'ms7', 'ms8', 'ms9', 'ms10', 'ms11', 'ms12']
    },
    support: {
        core: ['sc1', 'sc2', 'sc3', 'sc4'],
        sub: ['ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6',
              'ss7', 'ss8', 'ss9', 'ss10', 'ss11', 'ss12']
    }
};

// 現在の状態を保持
const currentState = {
    main: {
        characterId: null,
        corePotentials: {}, // { potentialId: { obtained: bool, acquired: bool } }
        subPotentials: {}   // { potentialId: { status: 'level6'|'level2-5'|'level1'|'none', count: number } }
    },
    support1: {
        characterId: null,
        corePotentials: {},
        subPotentials: {}
    },
    support2: {
        characterId: null,
        corePotentials: {},
        subPotentials: {}
    }
};

// ========================================
// ヘルパー関数
// ========================================

// 画像パスの自動生成
function getPotentialImagePath(charId, potentialId) {
    return `images/potentials/${charId}_${potentialId}.jpg`;
}

// Descriptionの取得
function getDescription(character, potentialId) {
    return character.descriptions[potentialId] || '説明文が設定されていません';
}

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // JSONデータの読み込み
    await loadCharacterData();
    
    // キャラクター選択ドロップダウンの生成
    populateCharacterSelects();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // ローカルストレージから現在の状態を復元
    loadCurrentState();
    
    // プリセットの初期化
    initializePresets();
});

// ========================================
// データ読み込み
// ========================================
async function loadCharacterData() {
    try {
        const response = await fetch('data/potential.json');
        if (!response.ok) {
            throw new Error('データの読み込みに失敗しました');
        }
        charactersData = await response.json();
        console.log('キャラクターデータ読み込み完了:', charactersData);
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        showError('データの読み込みに失敗しました。data/potential.jsonを確認してください。');
    }
}

// ========================================
// キャラクター選択ドロップダウンの生成
// ========================================
function populateCharacterSelects() {
    const selects = document.querySelectorAll('.character-select');
    
    selects.forEach(select => {
        // 既存のオプションをクリア（最初の「選択してください」以外）
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // キャラクターをオプションとして追加
        charactersData.characters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = char.name;
            select.appendChild(option);
        });
    });
}

// ========================================
// イベントリスナーの設定
// ========================================
function setupEventListeners() {
    // キャラクター選択
    document.querySelectorAll('.character-select').forEach(select => {
        select.addEventListener('change', handleCharacterSelect);
    });
    
    // 取得しない素質を非表示
    document.getElementById('hideUnobtained').addEventListener('change', handleHideUnobtained);
    
    // カウントリセット
    document.getElementById('resetCount').addEventListener('click', handleResetCount);
    
    // 初期化
    document.getElementById('resetAll').addEventListener('click', handleResetAll);
    
    // スクリーンショット
    document.getElementById('screenshot').addEventListener('click', handleScreenshot);
    
    // プリセット保存
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetNum = parseInt(e.target.dataset.preset);
            handleSavePreset(presetNum);
        });
    });
    
    // プリセット読み込み
    document.querySelectorAll('.btn-load').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetNum = parseInt(e.target.dataset.preset);
            handleLoadPreset(presetNum);
        });
    });
}

// ========================================
// キャラクター選択時の処理
// ========================================
function handleCharacterSelect(e) {
    const slot = e.target.dataset.slot;
    const charId = e.target.value;
    
    if (!charId) {
        // 選択解除
        currentState[slot].characterId = null;
        document.getElementById(`${slot}-potentials`).innerHTML = '';
        saveCurrentState();
        return;
    }
    
    const character = charactersData.characters.find(c => c.id === charId);
    if (!character) return;
    
    // 状態を更新
    currentState[slot].characterId = charId;
    currentState[slot].corePotentials = {};
    currentState[slot].subPotentials = {};
    
    // 素質を表示
    displayPotentials(slot, character);
    
    // 状態を保存
    saveCurrentState();
}

// ========================================
// 素質の表示
// ========================================
function displayPotentials(slot, character) {
    const container = document.getElementById(`${slot}-potentials`);
    container.innerHTML = '';
    
    // 主力 or 支援を判定
    const role = slot === 'main' ? 'main' : 'support';
    const potentialDef = POTENTIAL_DEFINITIONS[role];
    
    // コア素質セクション
    const coreSection = createPotentialSection('コア素質', potentialDef.core, character, slot, 'core');
    container.appendChild(coreSection);
    
    // サブ素質セクション
    const subSection = createPotentialSection('サブ素質', potentialDef.sub, character, slot, 'sub');
    container.appendChild(subSection);
}

// ========================================
// 素質セクションの作成
// ========================================
function createPotentialSection(title, potentialIds, character, slot, type) {
    const section = document.createElement('div');
    section.className = 'potential-group';
    
    const titleElem = document.createElement('div');
    titleElem.className = 'potential-group-title';
    titleElem.textContent = title;
    section.appendChild(titleElem);
    
    const grid = document.createElement('div');
    grid.className = 'potentials-grid';
    
    potentialIds.forEach(potentialId => {
        const card = createPotentialCard(character, potentialId, slot, type);
        grid.appendChild(card);
    });
    
    section.appendChild(grid);
    return section;
}

// ========================================
// 素質カードの作成
// ========================================
function createPotentialCard(character, potentialId, slot, type) {
    const card = document.createElement('div');
    card.className = 'potential-card';
    card.dataset.slot = slot;
    card.dataset.potentialId = potentialId;
    card.dataset.type = type;
    
    // 画像ラッパー
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'potential-image-wrapper';
    
    // 初期状態の設定
    if (type === 'core') {
        // コア素質の初期状態: 取得しない（グレーアウト）
        if (!currentState[slot].corePotentials[potentialId]) {
            currentState[slot].corePotentials[potentialId] = {
                obtained: false,
                acquired: false
            };
        }
        const state = currentState[slot].corePotentials[potentialId];
        if (!state.obtained) {
            imageWrapper.classList.add('grayed-out');
        }
        if (state.acquired) {
            imageWrapper.classList.add('obtained');
        }
    } else {
        // サブ素質の初期状態: 取得しない
        if (!currentState[slot].subPotentials[potentialId]) {
            currentState[slot].subPotentials[potentialId] = {
                status: 'none',
                count: 0
            };
        }
        const state = currentState[slot].subPotentials[potentialId];
        if (state.status === 'none') {
            imageWrapper.classList.add('grayed-out');
        }
        
        // レベル6の場合、サムズアップ表示
        if (state.status === 'level6') {
            const thumbsUp = document.createElement('div');
            thumbsUp.className = 'thumbs-up';
            thumbsUp.textContent = '👍';
            imageWrapper.appendChild(thumbsUp);
        }
        
        // カウント表示
        if (state.count > 0) {
            const countElem = document.createElement('div');
            countElem.className = 'potential-count';
            countElem.textContent = state.count;
            imageWrapper.appendChild(countElem);
        }
    }
    
    // 画像
    const img = document.createElement('img');
    img.className = 'potential-image';
    img.src = getPotentialImagePath(character.id, potentialId);
    img.alt = potentialId;
    img.onerror = () => {
        img.src = 'https://placehold.co/80x80?text=' + potentialId;
    };
    
    // 画像クリックイベント
    img.addEventListener('click', () => handlePotentialImageClick(slot, potentialId, type));
    
    imageWrapper.appendChild(img);
    
    // ツールチップ（説明文）
    const tooltip = document.createElement('div');
    tooltip.className = 'potential-tooltip';
    tooltip.textContent = getDescription(character, potentialId);
    imageWrapper.appendChild(tooltip);
    
    card.appendChild(imageWrapper);
    
    // 素質名（廃止されたのでコメントアウト）
    // const name = document.createElement('div');
    // name.className = 'potential-name';
    // name.textContent = potentialId;
    // card.appendChild(name);
    
    // ステータスボタン
    const statusDiv = document.createElement('div');
    statusDiv.className = 'potential-status';
    
    if (type === 'core') {
        // コア素質: トグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'status-btn';
        const state = currentState[slot].corePotentials[potentialId];
        toggleBtn.textContent = state.obtained ? '取得する' : '取得しない';
        toggleBtn.classList.add(state.obtained ? 'active' : 'inactive');
        toggleBtn.addEventListener('click', () => handleCoreToggle(slot, potentialId));
        statusDiv.appendChild(toggleBtn);
    } else {
        // サブ素質: レベル選択ドロップダウン
        const select = document.createElement('select');
        select.className = 'status-select';
        
        const options = [
            { value: 'level6', text: 'レベル6' },
            { value: 'level2-5', text: 'レベル2～5' },
            { value: 'level1', text: 'レベル1止め' },
            { value: 'none', text: '取得しない' }
        ];
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });
        
        const state = currentState[slot].subPotentials[potentialId];
        select.value = state.status;
        select.addEventListener('change', (e) => handleSubLevelChange(slot, potentialId, e.target.value));
        statusDiv.appendChild(select);
    }
    
    card.appendChild(statusDiv);
    
    return card;
}

// ========================================
// コア素質のトグル処理
// ========================================
function handleCoreToggle(slot, potentialId) {
    const state = currentState[slot].corePotentials[potentialId];
    const newObtained = !state.obtained;
    
    // 取得する→取得しないへの変更は常にOK
    if (!newObtained) {
        state.obtained = false;
        state.acquired = false;
        refreshPotentialDisplay(slot);
        saveCurrentState();
        return;
    }
    
    // 取得しない→取得するへの変更は、2つまでの制限をチェック
    const obtainedCount = Object.values(currentState[slot].corePotentials)
        .filter(s => s.obtained).length;
    
    if (obtainedCount >= MAX_CORE_POTENTIALS) {
        showError(`コア素質は${MAX_CORE_POTENTIALS}つまでしか取得できません`);
        return;
    }
    
    state.obtained = true;
    refreshPotentialDisplay(slot);
    saveCurrentState();
}

// ========================================
// 素質画像クリック処理
// ========================================
function handlePotentialImageClick(slot, potentialId, type) {
    if (type === 'core') {
        // コア素質: 取得する状態の時のみカウント切り替え
        const state = currentState[slot].corePotentials[potentialId];
        if (!state.obtained) return;
        
        state.acquired = !state.acquired;
    } else {
        // サブ素質: レベル1以上の時のみカウント増加
        const state = currentState[slot].subPotentials[potentialId];
        if (state.status === 'none') return;
        
        state.count = (state.count + 1) % (MAX_SUB_LEVEL + 1);
    }
    
    refreshPotentialDisplay(slot);
    saveCurrentState();
}

// ========================================
// サブ素質のレベル変更処理
// ========================================
function handleSubLevelChange(slot, potentialId, newStatus) {
    const state = currentState[slot].subPotentials[potentialId];
    state.status = newStatus;
    state.count = 0; // レベル変更時はカウントをリセット
    
    refreshPotentialDisplay(slot);
    saveCurrentState();
}

// ========================================
// 素質表示の更新
// ========================================
function refreshPotentialDisplay(slot) {
    const charId = currentState[slot].characterId;
    if (!charId) return;
    
    const character = charactersData.characters.find(c => c.id === charId);
    if (!character) return;
    
    displayPotentials(slot, character);
}

// ========================================
// 取得しない素質を非表示
// ========================================
function handleHideUnobtained(e) {
    const hideUnobtained = e.target.checked;
    
    document.querySelectorAll('.potential-card').forEach(card => {
        const slot = card.dataset.slot;
        const potentialId = card.dataset.potentialId;
        const type = card.dataset.type;
        
        let shouldHide = false;
        
        if (type === 'core') {
            const state = currentState[slot].corePotentials[potentialId];
            shouldHide = state && !state.obtained;
        } else {
            const state = currentState[slot].subPotentials[potentialId];
            shouldHide = state && state.status === 'none';
        }
        
        if (hideUnobtained && shouldHide) {
            card.classList.add('hidden');
        } else {
            card.classList.remove('hidden');
        }
    });
}

// ========================================
// カウントリセット
// ========================================
function handleResetCount() {
    // コア素質のacquiredをすべてfalseに
    Object.values(currentState).forEach(slotState => {
        Object.values(slotState.corePotentials).forEach(state => {
            state.acquired = false;
        });
    });
    
    // サブ素質のcountをすべて0に
    Object.values(currentState).forEach(slotState => {
        Object.values(slotState.subPotentials).forEach(state => {
            state.count = 0;
        });
    });
    
    // 表示を更新
    ['main', 'support1', 'support2'].forEach(slot => {
        refreshPotentialDisplay(slot);
    });
    
    saveCurrentState();
}

// ========================================
// 初期化
// ========================================
function handleResetAll() {
    if (!confirm('すべての設定を初期化しますか？')) {
        return;
    }
    
    // 状態をクリア
    ['main', 'support1', 'support2'].forEach(slot => {
        currentState[slot].characterId = null;
        currentState[slot].corePotentials = {};
        currentState[slot].subPotentials = {};
        
        // キャラクター選択をリセット
        const select = document.querySelector(`.character-select[data-slot="${slot}"]`);
        if (select) {
            select.value = '';
        }
        
        // 素質表示をクリア
        const container = document.getElementById(`${slot}-potentials`);
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // チェックボックスをリセット
    document.getElementById('hideUnobtained').checked = false;
    
    saveCurrentState();
}

// ========================================
// プリセット管理
// ========================================
function initializePresets() {
    for (let i = 1; i <= 10; i++) {
        const preset = loadPreset(i);
        if (preset) {
            updatePresetDisplay(i, preset);
            // 読み込みボタンを有効化
            const loadBtn = document.querySelector(`.btn-load[data-preset="${i}"]`);
            if (loadBtn) {
                loadBtn.disabled = false;
            }
        }
    }
}

function handleSavePreset(presetNum) {
    const existingPreset = loadPreset(presetNum);
    
    // カウントをリセットした状態でコピー
    const stateToSave = JSON.parse(JSON.stringify(currentState));
    Object.values(stateToSave).forEach(slotState => {
        Object.values(slotState.corePotentials).forEach(state => {
            state.acquired = false;
        });
        Object.values(slotState.subPotentials).forEach(state => {
            state.count = 0;
        });
    });
    
    // 既存プリセットと異なる場合は確認
    if (existingPreset && JSON.stringify(existingPreset) !== JSON.stringify(stateToSave)) {
        if (!confirm(`プリセット${presetNum}を上書きしますか？`)) {
            return;
        }
    }
    
    // 保存
    localStorage.setItem(`preset_${presetNum}`, JSON.stringify(stateToSave));
    updatePresetDisplay(presetNum, stateToSave);
    
    // 読み込みボタンを有効化
    const loadBtn = document.querySelector(`.btn-load[data-preset="${presetNum}"]`);
    if (loadBtn) {
        loadBtn.disabled = false;
    }
}

function handleLoadPreset(presetNum) {
    const preset = loadPreset(presetNum);
    if (!preset) return;
    
    // 現在の状態が初期状態でない場合は確認
    const isInitialState = !currentState.main.characterId && 
                          !currentState.support1.characterId && 
                          !currentState.support2.characterId;
    
    if (!isInitialState && JSON.stringify(currentState) !== JSON.stringify(preset)) {
        if (!confirm('現在表示中の情報は失われますが、よろしいですか？')) {
            return;
        }
    }
    
    // プリセットを読み込み
    Object.assign(currentState, JSON.parse(JSON.stringify(preset)));
    
    // UIを更新
    ['main', 'support1', 'support2'].forEach(slot => {
        const select = document.querySelector(`.character-select[data-slot="${slot}"]`);
        if (select) {
            select.value = currentState[slot].characterId || '';
        }
        
        if (currentState[slot].characterId) {
            const character = charactersData.characters.find(c => c.id === currentState[slot].characterId);
            if (character) {
                displayPotentials(slot, character);
            }
        } else {
            document.getElementById(`${slot}-potentials`).innerHTML = '';
        }
    });
    
    saveCurrentState();
}

function loadPreset(presetNum) {
    const data = localStorage.getItem(`preset_${presetNum}`);
    return data ? JSON.parse(data) : null;
}

function updatePresetDisplay(presetNum, preset) {
    const presetItem = document.querySelector(`.preset-item[data-preset="${presetNum}"]`);
    if (!presetItem) return;
    
    const iconImg = presetItem.querySelector('.preset-icon');
    if (preset.main.characterId) {
        const character = charactersData.characters.find(c => c.id === preset.main.characterId);
        if (character) {
            iconImg.src = character.icon;
            iconImg.style.display = 'block';
        }
    } else {
        iconImg.style.display = 'none';
    }
}

// ========================================
// ローカルストレージ
// ========================================
function saveCurrentState() {
    localStorage.setItem('currentState', JSON.stringify(currentState));
}

function loadCurrentState() {
    const data = localStorage.getItem('currentState');
    if (data) {
        Object.assign(currentState, JSON.parse(data));
        
        // UIに反映
        ['main', 'support1', 'support2'].forEach(slot => {
            const select = document.querySelector(`.character-select[data-slot="${slot}"]`);
            if (currentState[slot].characterId) {
                select.value = currentState[slot].characterId;
                const character = charactersData.characters.find(c => c.id === currentState[slot].characterId);
                if (character) {
                    displayPotentials(slot, character);
                }
            }
        });
    }
}

// ========================================
// スクリーンショット
// ========================================
async function handleScreenshot() {
    try {
        // html2canvasを使用してページをキャプチャ
        const canvas = await html2canvas(document.querySelector('.container'), {
            width: 1920,
            height: 1080,
            scale: 1,
            backgroundColor: '#ffffff'
        });
        
        // Canvasを画像に変換してダウンロード
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `potential_simulator_${new Date().getTime()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('スクリーンショットエラー:', error);
        showError('スクリーンショットの生成に失敗しました');
    }
}

// ========================================
// エラーメッセージ表示
// ========================================
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // 3秒後に自動で消す
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}
