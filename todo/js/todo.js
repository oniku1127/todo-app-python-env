/**
 * Todo Class - データモデル
 * TODOアイテムの基本データ構造と操作を定義
 */
class Todo {
    /**
     * Todoインスタンスを作成
     * @param {Object} data - Todo項目のデータ
     * @param {string} data.title - タスクタイトル（必須）
     * @param {string} [data.description=''] - 詳細説明
     * @param {string} [data.category=''] - カテゴリ
     * @param {string} [data.priority='medium'] - 優先度（high/medium/low）
     * @param {Date|string|null} [data.dueDate=null] - 期限
     * @param {boolean} [data.completed=false] - 完了状態
     * @param {string} [data.id] - 一意識別子（自動生成）
     * @param {Date|string} [data.createdAt] - 作成日時（自動設定）
     * @param {Date|string} [data.updatedAt] - 更新日時（自動設定）
     */
    constructor(data) {
        // 必須フィールドのバリデーション
        if (!data || typeof data.title !== 'string' || data.title.trim() === '') {
            throw new Error('Todo title is required and must be a non-empty string');
        }

        // データの初期化
        this.id = data.id || this._generateId();
        this.title = this._sanitizeText(data.title);
        this.description = this._sanitizeText(data.description || '');
        this.category = this._validateCategory(data.category || '');
        this.priority = this._validatePriority(data.priority || 'medium');
        this.dueDate = this._parseDueDate(data.dueDate);
        this.completed = Boolean(data.completed);
        this.createdAt = this._parseDate(data.createdAt) || new Date();
        this.updatedAt = this._parseDate(data.updatedAt) || new Date();
    }

    /**
     * Todo項目を更新
     * @param {Object} updateData - 更新するデータ
     * @returns {Todo} - 更新された自身のインスタンス
     */
    update(updateData) {
        // バリデーションを行いながら更新
        if (updateData.title !== undefined) {
            if (typeof updateData.title !== 'string' || updateData.title.trim() === '') {
                throw new Error('Title must be a non-empty string');
            }
            this.title = this._sanitizeText(updateData.title);
        }

        if (updateData.description !== undefined) {
            this.description = this._sanitizeText(updateData.description);
        }

        if (updateData.category !== undefined) {
            this.category = this._validateCategory(updateData.category);
        }

        if (updateData.priority !== undefined) {
            this.priority = this._validatePriority(updateData.priority);
        }

        if (updateData.dueDate !== undefined) {
            this.dueDate = this._parseDueDate(updateData.dueDate);
        }

        if (updateData.completed !== undefined) {
            this.completed = Boolean(updateData.completed);
        }

        // 更新日時を自動設定
        this.updatedAt = new Date();

        return this;
    }

    /**
     * Todo項目を複製
     * @returns {Todo} - 新しいインスタンス
     */
    clone() {
        return new Todo({
            id: this._generateId(), // 新しいIDを生成
            title: this.title,
            description: this.description,
            category: this.category,
            priority: this.priority,
            dueDate: this.dueDate,
            completed: this.completed,
            createdAt: new Date(), // 新しい作成日時
            updatedAt: new Date()  // 新しい更新日時
        });
    }

    /**
     * 完了状態を切り替え
     * @returns {Todo} - 自身のインスタンス
     */
    toggleCompleted() {
        this.completed = !this.completed;
        this.updatedAt = new Date();
        return this;
    }

    /**
     * 期限の状態を取得
     * @returns {string} - 'overdue'（期限切れ）、'due-soon'（間もなく期限）、'normal'（通常）
     */
    getDueStatus() {
        if (!this.dueDate || this.completed) {
            return 'normal';
        }

        const now = new Date();
        const dueTime = new Date(this.dueDate).getTime();
        const currentTime = now.getTime();
        const timeDiff = dueTime - currentTime;

        // 24時間 = 86400000ミリ秒
        const oneDayInMs = 24 * 60 * 60 * 1000;

        if (timeDiff < 0) {
            return 'overdue'; // 期限切れ
        } else if (timeDiff < oneDayInMs) {
            return 'due-soon'; // 24時間以内に期限
        } else {
            return 'normal';
        }
    }

    /**
     * 表示用の期限テキストを取得
     * @returns {string} - フォーマットされた期限テキスト
     */
    getFormattedDueDate() {
        if (!this.dueDate) {
            return '';
        }

        const date = new Date(this.dueDate);
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const formattedDate = date.toLocaleDateString('ja-JP', options);
        const status = this.getDueStatus();

        switch (status) {
            case 'overdue':
                return `⚠️ ${formattedDate} (期限切れ)`;
            case 'due-soon':
                return `🔔 ${formattedDate} (間もなく期限)`;
            default:
                return `📅 ${formattedDate}`;
        }
    }

    /**
     * JSON形式でエクスポート
     * @returns {Object} - シリアライズ可能なオブジェクト
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            category: this.category,
            priority: this.priority,
            dueDate: this.dueDate ? this.dueDate.toISOString() : null,
            completed: this.completed,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * 検索用文字列を取得
     * @returns {string} - 検索対象文字列（タイトル + 説明）
     */
    getSearchText() {
        return `${this.title} ${this.description}`.toLowerCase();
    }

    // ===== プライベートメソッド =====

    /**
     * 一意のIDを生成
     * @returns {string} - UUID風のランダムID
     * @private
     */
    _generateId() {
        return 'todo-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * テキストをサニタイズ
     * @param {string} text - サニタイズするテキスト
     * @returns {string} - サニタイズされたテキスト
     * @private
     */
    _sanitizeText(text) {
        if (typeof text !== 'string') {
            return '';
        }
        // HTMLタグを除去し、前後の空白をトリム
        return text.replace(/<[^>]*>/g, '').trim();
    }

    /**
     * カテゴリをバリデーション
     * @param {string} category - カテゴリ名
     * @returns {string} - 正規化されたカテゴリ名
     * @private
     */
    _validateCategory(category) {
        const validCategories = ['work', 'personal', 'shopping', 'health', 'learning', 'other'];
        const normalizedCategory = typeof category === 'string' ? category.toLowerCase() : '';

        if (normalizedCategory === '' || validCategories.includes(normalizedCategory)) {
            return normalizedCategory;
        }

        // 無効なカテゴリの場合は空文字を返す
        console.warn(`Invalid category: ${category}. Using empty category.`);
        return '';
    }

    /**
     * 優先度をバリデーション
     * @param {string} priority - 優先度
     * @returns {string} - 正規化された優先度
     * @private
     */
    _validatePriority(priority) {
        const validPriorities = ['high', 'medium', 'low'];
        const normalizedPriority = typeof priority === 'string' ? priority.toLowerCase() : 'medium';

        if (validPriorities.includes(normalizedPriority)) {
            return normalizedPriority;
        }

        // 無効な優先度の場合はデフォルト値を返す
        console.warn(`Invalid priority: ${priority}. Using 'medium' as default.`);
        return 'medium';
    }

    /**
     * 期限日時をパース
     * @param {Date|string|null} dueDate - 期限日時
     * @returns {Date|null} - パースされた日時またはnull
     * @private
     */
    _parseDueDate(dueDate) {
        if (!dueDate) {
            return null;
        }

        let date;
        if (dueDate instanceof Date) {
            date = new Date(dueDate.getTime());
        } else if (typeof dueDate === 'string') {
            date = new Date(dueDate);
        } else {
            return null;
        }

        // 無効な日付の場合
        if (isNaN(date.getTime())) {
            console.warn(`Invalid due date: ${dueDate}`);
            return null;
        }

        return date;
    }

    /**
     * 日時をパース
     * @param {Date|string|null} dateValue - 日時
     * @returns {Date|null} - パースされた日時またはnull
     * @private
     */
    _parseDate(dateValue) {
        if (!dateValue) {
            return null;
        }

        let date;
        if (dateValue instanceof Date) {
            date = new Date(dateValue.getTime());
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else {
            return null;
        }

        // 無効な日付の場合
        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }

    // ===== 静的メソッド =====

    /**
     * JSONデータからTodoインスタンスを作成
     * @param {Object} jsonData - JSONデータ
     * @returns {Todo} - Todoインスタンス
     * @static
     */
    static fromJSON(jsonData) {
        if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('Invalid JSON data for Todo creation');
        }

        return new Todo(jsonData);
    }

    /**
     * 複数のJSONデータからTodo配列を作成
     * @param {Array} jsonArray - JSONデータの配列
     * @returns {Array<Todo>} - Todo配列
     * @static
     */
    static fromJSONArray(jsonArray) {
        if (!Array.isArray(jsonArray)) {
            throw new Error('Input must be an array');
        }

        return jsonArray.map(jsonData => {
            try {
                return Todo.fromJSON(jsonData);
            } catch (error) {
                console.error('Error creating Todo from JSON:', error, jsonData);
                return null;
            }
        }).filter(todo => todo !== null);
    }

    /**
     * カテゴリの表示名を取得
     * @param {string} category - カテゴリID
     * @returns {string} - 表示名
     * @static
     */
    static getCategoryDisplayName(category) {
        const categoryMap = {
            'work': '仕事',
            'personal': '個人',
            'shopping': '買い物',
            'health': '健康',
            'learning': '学習',
            'other': 'その他'
        };
        return categoryMap[category] || category;
    }

    /**
     * 優先度の表示名を取得
     * @param {string} priority - 優先度ID
     * @returns {string} - 表示名
     * @static
     */
    static getPriorityDisplayName(priority) {
        const priorityMap = {
            'high': '高',
            'medium': '中',
            'low': '低'
        };
        return priorityMap[priority] || priority;
    }

    /**
     * 優先度の数値を取得（ソート用）
     * @param {string} priority - 優先度ID
     * @returns {number} - 優先度の数値（高いほど優先）
     * @static
     */
    static getPriorityValue(priority) {
        const priorityValues = {
            'high': 3,
            'medium': 2,
            'low': 1
        };
        return priorityValues[priority] || 2;
    }
}