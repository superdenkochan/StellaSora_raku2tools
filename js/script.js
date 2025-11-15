// ========================================
// グローバル変数
// ========================================
let charactersData = null; // JSONから読み込んだデータ
const MAX_SUB_LEVEL = 6; // サブ素質の最大レベル（アップデートで変更可能）
const MAX_CORE_POTENTIALS = 2; // コア素質の最大取得数

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
    
    // プリセット保存・読み込み
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetNumber = e.target.dataset.preset;
            handleSavePreset(presetNumber);
        });
    });
    
    document.querySelectorAll('.btn-load').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetNumber = e.target.dataset.preset;
            handleLoadPreset(presetNumber);
        });
    });
}

// ========================================
// キャラクター選択処理
// ========================================
function handleCharacterSelect(e) {
    const select = e.target;
    const slot = select.dataset.slot; // 'main', 'support1', 'support2'
    const characterId = select.value;
    
    if (!characterId) {
        // キャラクター未選択の場合、素質をクリア
        clearPotentials(slot);
        currentState[slot].characterId = null;
        return;
    }
    
    // キャラクターデータを取得
    const character = charactersData.characters.find(c => c.id === characterId);
    if (!character) {
        console.error('キャラクターが見つかりません:', characterId);
        return;
    }
    
    // 状態を更新
    currentState[slot].characterId = characterId;
    
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
    
    // 主力か支援かで素質データを切り替え
    const potentialType = slot === 'main' ? 'main' : 'support';
    const potentials = character.potentials[potentialType];
    
    // コア素質セクション
    const coreSection = createPotentialSection('コア素質', potentials.core, slot, 'core');
    container.appendChild(coreSection);
    
    // サブ素質セクション
    const subSection = createPotentialSection('サブ素質', potentials.sub, slot, 'sub');
    container.appendChild(subSection);
    
    // 状態の初期化（既存の状態があればそれを使う、なければ新規作成）
    if (!currentState[slot].corePotentials || Object.keys(currentState[slot].corePotentials).length === 0) {
        initializePotentialStates(slot, potentials);
    }
    
    // UIに状態を反映
    applyStatesToUI(slot);
}

// ========================================
// 素質セクションの作成
// ========================================
function createPotentialSection(title, potentials, slot, type) {
    const section = document.createElement('div');
    section.className = 'potential-group';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'potential-group-title';
    titleElement.textContent = title;
    section.appendChild(titleElement);
    
    const grid = document.createElement('div');
    grid.className = 'potentials-grid';
    
    potentials.forEach(potential => {
        const card = createPotentialCard(potential, slot, type);
        grid.appendChild(card);
    });
    
    section.appendChild(grid);
    return section;
}

// ========================================
// 素質カードの作成
// ========================================
function createPotentialCard(potential, slot, type) {
    const card = document.createElement('div');
    card.className = 'potential-card';
    card.dataset.potentialId = potential.id;
    card.dataset.slot = slot;
    card.dataset.type = type;
    
    // 画像ラッパー
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'potential-image-wrapper';
    
    // 画像
    const image = document.createElement('img');
    image.className = 'potential-image';
    image.src = potential.image;
    image.alt = potential.name;
    imageWrapper.appendChild(image);
    
    // ツールチップ（説明文）
    const tooltip = document.createElement('div');
    tooltip.className = 'potential-tooltip';
    tooltip.textContent = potential.description;
    imageWrapper.appendChild(tooltip);
    
    // カウント表示（後で追加）
    const countDisplay = document.createElement('div');
    countDisplay.className = 'potential-count';
    countDisplay.style.display = 'none';
    imageWrapper.appendChild(countDisplay);
    
    // 画像クリックイベント
    imageWrapper.addEventListener('click', () => handlePotentialImageClick(slot, type, potential.id));
    
    card.appendChild(imageWrapper);
    
    // 名前
    const name = document.createElement('div');
    name.className = 'potential-name';
    name.textContent = potential.name;
    card.appendChild(name);
    
    // ステータス選択
    const statusControl = createStatusControl(slot, type, potential.id);
    card.appendChild(statusControl);
    
    return card;
}

// ========================================
// ステータスコントロールの作成
// ========================================
function createStatusControl(slot, type, potentialId) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'potential-status';
    
    if (type === 'core') {
        // コア素質：トグルボタン
        const button = document.createElement('button');
        button.className = 'status-btn inactive';
        button.textContent = '取得しない';
        button.dataset.slot = slot;
        button.dataset.type = type;
        button.dataset.potentialId = potentialId;
        button.addEventListener('click', () => handleCoreStatusToggle(slot, potentialId));
        statusDiv.appendChild(button);
    } else {
        // サブ素質：プルダウン
        const select = document.createElement('select');
        select.className = 'status-select';
        select.dataset.slot = slot;
        select.dataset.type = type;
        select.dataset.potentialId = potentialId;
        
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
        
        select.addEventListener('change', () => handleSubStatusChange(slot, potentialId, select.value));
        statusDiv.appendChild(select);
    }
    
    return statusDiv;
}

// ========================================
// 素質状態の初期化
// ========================================
function initializePotentialStates(slot, potentials) {
    // コア素質
    currentState[slot].corePotentials = {};
    potentials.core.forEach(p => {
        currentState[slot].corePotentials[p.id] = {
            obtained: false,  // 取得する/しない
            acquired: false   // 取得済みかどうか（チェックマーク）
        };
    });
    
    // サブ素質
    currentState[slot].subPotentials = {};
    potentials.sub.forEach(p => {
        currentState[slot].subPotentials[p.id] = {
            status: 'none',  // 'level6', 'level2-5', 'level1', 'none'
            count: 0         // クリックカウント
        };
    });
}

// ========================================
// UIに状態を反映
// ========================================
function applyStatesToUI(slot) {
    const container = document.getElementById(`${slot}-potentials`);
    
    // コア素質
    Object.entries(currentState[slot].corePotentials).forEach(([potentialId, state]) => {
        const card = container.querySelector(`.potential-card[data-potential-id="${potentialId}"][data-type="core"]`);
        if (!card) return;
        
        const button = card.querySelector('.status-btn');
        const imageWrapper = card.querySelector('.potential-image-wrapper');
        
        if (state.obtained) {
            button.textContent = '取得する';
            button.className = 'status-btn active';
            imageWrapper.classList.remove('grayed-out');
        } else {
            button.textContent = '取得しない';
            button.className = 'status-btn inactive';
            imageWrapper.classList.add('grayed-out');
        }
        
        if (state.acquired) {
            imageWrapper.classList.add('obtained');
        } else {
            imageWrapper.classList.remove('obtained');
        }
    });
    
    // サブ素質
    Object.entries(currentState[slot].subPotentials).forEach(([potentialId, state]) => {
        const card = container.querySelector(`.potential-card[data-potential-id="${potentialId}"][data-type="sub"]`);
        if (!card) return;
        
        const select = card.querySelector('.status-select');
        const imageWrapper = card.querySelector('.potential-image-wrapper');
        const countDisplay = card.querySelector('.potential-count');
        
        select.value = state.status;
        
        // グレーアウト
        if (state.status === 'none') {
            imageWrapper.classList.add('grayed-out');
        } else {
            imageWrapper.classList.remove('grayed-out');
        }
        
        // レベル6のサムズアップ
        let thumbsUp = imageWrapper.querySelector('.thumbs-up');
        if (state.status === 'level6') {
            if (!thumbsUp) {
                thumbsUp = document.createElement('div');
                thumbsUp.className = 'thumbs-up';
                thumbsUp.textContent = '👍';
                imageWrapper.appendChild(thumbsUp);
            }
        } else {
            if (thumbsUp) {
                thumbsUp.remove();
            }
        }
        
        // カウント表示
        if (state.count > 0 && state.status !== 'none') {
            countDisplay.textContent = state.count;
            countDisplay.style.display = 'block';
        } else {
            countDisplay.style.display = 'none';
        }
    });
}

// ========================================
// コア素質のステータストグル
// ========================================
function handleCoreStatusToggle(slot, potentialId) {
    const state = currentState[slot].corePotentials[potentialId];
    
    if (!state.obtained) {
        // 「取得しない」→「取得する」に変更しようとしている
        // 既に2つ取得しているかチェック
        const obtainedCount = Object.values(currentState[slot].corePotentials).filter(s => s.obtained).length;
        
        if (obtainedCount >= MAX_CORE_POTENTIALS) {
            showError('コア素質は2つしか取得できません');
            return;
        }
        
        state.obtained = true;
    } else {
        // 「取得する」→「取得しない」に変更
        state.obtained = false;
        state.acquired = false; // チェックマークもリセット
    }
    
    applyStatesToUI(slot);
    saveCurrentState();
}

// ========================================
// サブ素質のステータス変更
// ========================================
function handleSubStatusChange(slot, potentialId, newStatus) {
    const state = currentState[slot].subPotentials[potentialId];
    state.status = newStatus;
    
    // ステータスが変わったらカウントをリセット
    state.count = 0;
    
    applyStatesToUI(slot);
    saveCurrentState();
}

// ========================================
// 素質画像クリック処理
// ========================================
function handlePotentialImageClick(slot, type, potentialId) {
    if (type === 'core') {
        // コア素質の場合
        const state = currentState[slot].corePotentials[potentialId];
        
        if (!state.obtained) {
            // 「取得しない」状態では何もしない
            return;
        }
        
        // チェックマークのトグル
        state.acquired = !state.acquired;
        
    } else {
        // サブ素質の場合
        const state = currentState[slot].subPotentials[potentialId];
        
        if (state.status === 'none') {
            // 「取得しない」状態では何もしない
            return;
        }
        
        // カウントを増加（最大値に達したらリセット）
        state.count++;
        if (state.count > MAX_SUB_LEVEL) {
            state.count = 0;
        }
    }
    
    applyStatesToUI(slot);
    saveCurrentState();
}

// ========================================
// 取得しない素質を非表示
// ========================================
function handleHideUnobtained(e) {
    const hide = e.target.checked;
    
    document.querySelectorAll('.potential-card').forEach(card => {
        const slot = card.dataset.slot;
        const type = card.dataset.type;
        const potentialId = card.dataset.potentialId;
        
        if (!slot || !currentState[slot]) return;
        
        let shouldHide = false;
        
        if (type === 'core') {
            const state = currentState[slot].corePotentials[potentialId];
            shouldHide = state && !state.obtained;
        } else {
            const state = currentState[slot].subPotentials[potentialId];
            shouldHide = state && state.status === 'none';
        }
        
        if (hide && shouldHide) {
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
    // コア素質のacquiredをリセット
    Object.keys(currentState).forEach(slot => {
        if (currentState[slot].corePotentials) {
            Object.values(currentState[slot].corePotentials).forEach(state => {
                state.acquired = false;
            });
        }
        
        // サブ素質のcountをリセット
        if (currentState[slot].subPotentials) {
            Object.values(currentState[slot].subPotentials).forEach(state => {
                state.count = 0;
            });
        }
    });
    
    // UIに反映
    ['main', 'support1', 'support2'].forEach(slot => {
        if (currentState[slot].characterId) {
            applyStatesToUI(slot);
        }
    });
    
    saveCurrentState();
}

// ========================================
// 初期化
// ========================================
function handleResetAll() {
    if (!confirm('初期化しますか？\n全ての設定がリセットされます。')) {
        return;
    }
    
    // 全ての状態をリセット
    Object.keys(currentState).forEach(slot => {
        currentState[slot] = {
            characterId: null,
            corePotentials: {},
            subPotentials: {}
        };
    });
    
    // UIをリセット
    document.querySelectorAll('.character-select').forEach(select => {
        select.value = '';
    });
    
    ['main', 'support1', 'support2'].forEach(slot => {
        clearPotentials(slot);
    });
    
    // チェックボックスもリセット
    document.getElementById('hideUnobtained').checked = false;
    
    saveCurrentState();
}

// ========================================
// 素質表示のクリア
// ========================================
function clearPotentials(slot) {
    const container = document.getElementById(`${slot}-potentials`);
    container.innerHTML = '';
}

// ========================================
// プリセット初期化
// ========================================
function initializePresets() {
    for (let i = 1; i <= 10; i++) {
        const preset = loadPreset(i);
        if (preset) {
            updatePresetThumbnail(i, preset);
            enableLoadButton(i);
        }
    }
}

// ========================================
// プリセット保存
// ========================================
function handleSavePreset(presetNumber) {
    const existingPreset = loadPreset(presetNumber);
    
    // カウントリセット状態で保存
    const stateToSave = JSON.parse(JSON.stringify(currentState)); // ディープコピー
    
    // カウントをリセット
    Object.keys(stateToSave).forEach(slot => {
        if (stateToSave[slot].corePotentials) {
            Object.values(stateToSave[slot].corePotentials).forEach(state => {
                state.acquired = false;
            });
        }
        if (stateToSave[slot].subPotentials) {
            Object.values(stateToSave[slot].subPotentials).forEach(state => {
                state.count = 0;
            });
        }
    });
    
    // 既存のプリセットと異なる場合は確認
    if (existingPreset && JSON.stringify(existingPreset) !== JSON.stringify(stateToSave)) {
        if (!confirm(`プリセット${presetNumber}を上書きしますか？`)) {
            return;
        }
    }
    
    // 保存
    localStorage.setItem(`preset_${presetNumber}`, JSON.stringify(stateToSave));
    updatePresetThumbnail(presetNumber, stateToSave);
    enableLoadButton(presetNumber);
}

// ========================================
// プリセット読み込み
// ========================================
function handleLoadPreset(presetNumber) {
    const preset = loadPreset(presetNumber);
    if (!preset) return;
    
    // 現在の状態が初期化状態でない場合は確認
    const isInitialState = !currentState.main.characterId && 
                           !currentState.support1.characterId && 
                           !currentState.support2.characterId;
    
    if (!isInitialState) {
        if (!confirm('現在表示中の情報は失われますが、よろしいですか？')) {
            return;
        }
    }
    
    // プリセットを現在の状態にコピー
    Object.assign(currentState, JSON.parse(JSON.stringify(preset)));
    
    // UIに反映
    ['main', 'support1', 'support2'].forEach(slot => {
        const select = document.querySelector(`.character-select[data-slot="${slot}"]`);
        if (currentState[slot].characterId) {
            select.value = currentState[slot].characterId;
            const character = charactersData.characters.find(c => c.id === currentState[slot].characterId);
            if (character) {
                displayPotentials(slot, character);
            }
        } else {
            select.value = '';
            clearPotentials(slot);
        }
    });
    
    saveCurrentState();
}

// ========================================
// プリセット読み込み（ローカルストレージから）
// ========================================
function loadPreset(presetNumber) {
    const data = localStorage.getItem(`preset_${presetNumber}`);
    return data ? JSON.parse(data) : null;
}

// ========================================
// プリセットサムネイル更新
// ========================================
function updatePresetThumbnail(presetNumber, preset) {
    const presetItem = document.querySelector(`.preset-item[data-preset="${presetNumber}"]`);
    const icon = presetItem.querySelector('.preset-icon');
    
    if (preset.main.characterId) {
        const character = charactersData.characters.find(c => c.id === preset.main.characterId);
        if (character) {
            icon.src = character.icon;
            icon.style.display = 'block';
        }
    } else {
        icon.style.display = 'none';
    }
}

// ========================================
// 読み込みボタンの有効化
// ========================================
function enableLoadButton(presetNumber) {
    const loadButton = document.querySelector(`.btn-load[data-preset="${presetNumber}"]`);
    loadButton.disabled = false;
}

// ========================================
// 現在の状態を保存（ローカルストレージ）
// ========================================
function saveCurrentState() {
    localStorage.setItem('currentState', JSON.stringify(currentState));
}

// ========================================
// 現在の状態を読み込み（ローカルストレージ）
// ========================================
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