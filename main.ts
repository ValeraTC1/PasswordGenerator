import {
    App, Plugin, PluginSettingTab, Setting,
    addIcon, WorkspaceLeaf, ItemView, Notice
} from 'obsidian';

interface PasswordGeneratorSettings {
    defaultSalt: string;
    defaultLength: number;
    defaultIterations: number;
}

const DEFAULT_SETTINGS: PasswordGeneratorSettings = {
    defaultSalt: 'obsidian-salt',
        defaultLength: 16,
            defaultIterations: 100000
};

// Иконка замка
const LOCK_ICON = `
<svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C9.243 2 7 4.243 7 7V9H6C4.895 9 4 9.895 4 11V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V11C20 9.895 19.105 9 18 9H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V9H9V7C9 5.346 10.346 4 12 4ZM18 11V20H6V11H18Z" fill="currentColor"/>
</svg>`;

// Кастомная вью для боковой панели
class PasswordGeneratorView extends ItemView {
    plugin: PasswordGeneratorPlugin;
    private passwordOutput: HTMLElement;
    private wordInput: HTMLInputElement;
    private saltInput: HTMLInputElement;
    private lengthSlider: HTMLInputElement;
    private iterationsSlider: HTMLInputElement;

    constructor(leaf: WorkspaceLeaf, plugin: PasswordGeneratorPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return 'password-generator-sidebar';
    }

    getDisplayText(): string {
        return 'Генератор паролей';
    }

    getIcon(): string {
        return 'lock';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('password-generator-sidebar');

        // Заголовок
        const header = container.createDiv('sidebar-header');
        header.createEl('h2', { text: 'Генератор паролей' });

        // Контейнер для формы
        const formContainer = container.createDiv('password-form-container');

        // Поле для слова
        const wordSetting = new Setting(formContainer)
        .setName('Базовое слово')
        .setDesc('Слово или фраза для генерации')
        .addText(text => {
            this.wordInput = text.inputEl;
            text.setPlaceholder('Введите слово')
            .setValue(this.plugin.currentWord || '')
            .onChange(value => this.plugin.currentWord = value);
        });

        // Поле для соли
        const saltSetting = new Setting(formContainer)
        .setName('Соль')
        .setDesc('Дополнительная соль для хеширования')
        .addText(text => {
            this.saltInput = text.inputEl;
            text.setPlaceholder('Введите соль')
            .setValue(this.plugin.currentSalt || this.plugin.settings.defaultSalt)
            .onChange(value => this.plugin.currentSalt = value);
        });

        // Слайдер длины пароля
        const lengthSetting = new Setting(formContainer)
        .setName('Длина пароля')
        .setDesc('Количество символов (8-32)')
        .addSlider(slider => {
            this.lengthSlider = slider.sliderEl;
            slider.setLimits(8, 32, 1)
            .setValue(this.plugin.currentLength)
            .onChange(value => this.plugin.currentLength = value)
            .setDynamicTooltip();
        });

        // Слайдер итераций
        const iterationsSetting = new Setting(formContainer)
        .setName('Итерации')
        .setDesc('Количество раундов хеширования')
        .addSlider(slider => {
            this.iterationsSlider = slider.sliderEl;
            slider.setLimits(10000, 500000, 10000)
            .setValue(this.plugin.currentIterations)
            .onChange(value => this.plugin.currentIterations = value)
            .setDynamicTooltip();
        });

        // Область вывода пароля
        const outputContainer = container.createDiv('password-output-container');
        outputContainer.createEl('h3', { text: 'Сгенерированный пароль' });

        this.passwordOutput = outputContainer.createDiv('password-output');
        this.passwordOutput.setText('Пароль появится здесь');

        // Кнопка генерации
        const buttonContainer = container.createDiv('button-container');
        new Setting(buttonContainer)
        .addButton(btn => btn
        .setButtonText('Сгенерировать пароль')
        .setCta()
        .onClick(async () => {
            if (!this.plugin.currentWord || this.plugin.currentWord.trim() === '') {
                new Notice('Введите базовое слово');
                return;
            }

            if (!this.plugin.currentSalt || this.plugin.currentSalt.trim() === '') {
                new Notice('Введите соль');
                return;
            }

            await this.generateAndShowPassword();
        }));
    }

    async onClose(): Promise<void> {
        // Ничего не делаем
    }

    async generateAndShowPassword(): Promise<void> {
        try {
            // Показываем индикатор загрузки
            this.passwordOutput.setText('Генерация...');
            this.passwordOutput.addClass('generating');

            const password = await this.plugin.generatePasswordHash(
                this.plugin.currentWord,
                this.plugin.currentSalt,
                this.plugin.currentLength,
                this.plugin.currentIterations
            );

            // Отображаем пароль
            this.passwordOutput.setText(password);
            this.passwordOutput.removeClass('generating');
            this.passwordOutput.addClass('generated');

            // Копируем в буфер обмена
            await this.copyPasswordToClipboard(password);

        } catch (error) {
            console.error('Ошибка генерации:', error);
            this.passwordOutput.setText('Ошибка генерации');
            this.passwordOutput.removeClass('generating');
            this.passwordOutput.addClass('error');
            new Notice('Ошибка генерации пароля. Проверьте консоль.');
        }
    }

    async copyPasswordToClipboard(password: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(password);
            new Notice('Пароль скопирован в буфер обмена');
        } catch (error) {
            console.error('Ошибка копирования:', error);
            new Notice('Не удалось скопировать пароль');
        }
    }
}

export default class PasswordGeneratorPlugin extends Plugin {
    settings: PasswordGeneratorSettings;
    currentWord: string = '';
    currentSalt: string = '';
    currentLength: number = 16;
    currentIterations: number = 100000;

    async onload(): Promise<void> {
        await this.loadSettings();

        // Добавляем иконку замка
        addIcon('lock', LOCK_ICON);

        // Добавляем иконку в левую панель
        this.addRibbonIcon('lock', 'Генератор паролей', (evt: MouseEvent) => {
            this.activateView();
        });

        // Регистрируем вью для боковой панели
        this.registerView(
            'password-generator-sidebar',
            (leaf: WorkspaceLeaf) => new PasswordGeneratorView(leaf, this)
        );

        // Добавляем вкладку настроек
        this.addSettingTab(new PasswordSettingTab(this.app, this));
    }

    // Активация боковой панели
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        // Закрываем существующую панель
        const existingLeaf = workspace.getLeavesOfType('password-generator-sidebar');
        if (existingLeaf.length > 0) {
            workspace.revealLeaf(existingLeaf[0]);
            return;
        }

        // Создаем новую панель справа
        const leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({
                type: 'password-generator-sidebar',
                active: true,
            });
            workspace.revealLeaf(leaf);
        }
    }

    async generatePasswordHash(word: string, salt: string, length: number, iterations: number): Promise<string> {
        try {
            const encoder = new TextEncoder();

            // 1. Импортируем пароль как ключ
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(word),
                                                              { name: 'PBKDF2' },
                                                              false,
                                                              ['deriveBits']
            );

            // 2. Выполняем ключевую деривацию
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode(salt),
                                                               iterations: iterations,
                                                               hash: 'SHA-256'
                },
                keyMaterial,
                256 // бит
            );

            // 3. Конвертируем в hex
            const hashArray = Array.from(new Uint8Array(derivedBits));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // 4. Форматируем в пароль
            return this.formatHashAsPassword(hashHex, length);

        } catch (error) {
            console.error('Ошибка в generatePasswordHash:', error);
            throw new Error(`Не удалось сгенерировать хеш: ${error.message}`);
        }
    }

    formatHashAsPassword(hashHex: string, length: number): string {
        const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';

        for (let i = 0; i < length; i++) {
            const hashByte = parseInt(hashHex.substr((i * 2) % hashHex.length, 2), 16);
            password += allChars[hashByte % allChars.length];
        }

        // Гарантируем наличие разных типов символов
        return this.ensurePasswordRequirements(password, hashHex);
    }

    ensurePasswordRequirements(password: string, hashHex: string): string {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

        if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecial) {
            return password;
        }

        const chars = password.split('');
        const checks = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial];
        const replacements = [
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'abcdefghijklmnopqrstuvwxyz',
            '0123456789',
            '!@#$%^&*()_+-=[]{}|;:,.<>?'
        ];

        // Используем части хеша для детерминированной замены
        for (let i = 0; i < checks.length; i++) {
            if (!checks[i]) {
                // Берем часть хеша для определения позиции
                const hashPart = hashHex.substr(i * 8, 8);
                const position = parseInt(hashPart.substr(0, 4), 16) % chars.length;
                const charIndex = parseInt(hashPart.substr(4, 4), 16) % replacements[i].length;

                chars[position] = replacements[i][charIndex];
            }
        }

        return chars.join('');
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.currentSalt = this.settings.defaultSalt;
        this.currentLength = this.settings.defaultLength;
        this.currentIterations = this.settings.defaultIterations;
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}

// Настройки плагина (оставляем, но убрали кнопку из интерфейса)
class PasswordSettingTab extends PluginSettingTab {
    plugin: PasswordGeneratorPlugin;

    constructor(app: App, plugin: PasswordGeneratorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Настройки генератора паролей' });

        new Setting(containerEl)
        .setName('Соль по умолчанию')
        .setDesc('Используется при каждом запуске')
        .addText(text => text
        .setValue(this.plugin.settings.defaultSalt)
        .onChange(async value => {
            this.plugin.settings.defaultSalt = value;
            await this.plugin.saveSettings();
        }));

        new Setting(containerEl)
        .setName('Длина пароля по умолчанию')
        .setDesc('Количество символов')
        .addSlider(slider => slider
        .setLimits(8, 32, 1)
        .setValue(this.plugin.settings.defaultLength)
        .onChange(async value => {
            this.plugin.settings.defaultLength = value;
            await this.plugin.saveSettings();
        })
        .setDynamicTooltip());

        new Setting(containerEl)
        .setName('Итерации по умолчанию')
        .setDesc('Количество раундов хеширования')
        .addSlider(slider => slider
        .setLimits(10000, 500000, 10000)
        .setValue(this.plugin.settings.defaultIterations)
        .onChange(async value => {
            this.plugin.settings.defaultIterations = value;
            await this.plugin.saveSettings();
        })
        .setDynamicTooltip());
    }
}
