import { Conversation } from "@11labs/client";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

/**
 * Gets the path of an existing note
 */
export function getNotePath(app: App, title: string): string | null {
	const fileName = title.replace(/[/\\?%*:|"<>]/g, "-").trim() + ".md";
	const files = app.vault.getFiles();
	const file = files.find((f) => f.name === fileName);
	return file ? file.path : null;
}

/**
 * Reads the content of a note
 * @param app - Obsidian App instance
 * @param title - Note title
 * @returns Promise<string | null> - Note content or null if not found
 */
export async function readNote(
	app: App,
	title: string
): Promise<string | null> {
	const path = getNotePath(app, title);
	if (!path) return null;

	const file = app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) {
		return await app.vault.read(file);
	}
	return null;
}

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	agentId: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	agentId: "",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new SampleModal(this.app, this.settings).open();
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-voice-ai-agent",
			name: "Open ElevenLabs Conversational AI",
			callback: () => {
				new SampleModal(this.app, this.settings).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	private conversation: Conversation | null;
	private settings: MyPluginSettings;

	constructor(app: App, settings: MyPluginSettings) {
		super(app);
		this.settings = settings;
		this.conversation = null;
	}

	async onOpen() {
		const { contentEl, conversation } = this;
		contentEl.setText("Woah!");
		this.conversation = await Conversation.startSession({
			// agentId: "hVo4wiqvqg0jPtI4tiTp",
			agentId: this.settings.agentId,
			clientTools: {
				saveNote: async ({ message }) => {
					console.log(message);
					await this.app.vault.create("New Note.md", message);
				},
				getNote: async ({ noteName }) => {
					console.log(noteName);
					const content = await readNote(this.app, noteName);
					if (content) {
						console.log(content);
						return content;
					}
					return "";
				},
			},
		});
	}

	async onClose() {
		const { contentEl } = this;
		if (this.conversation) {
			await this.conversation.endSession();
		}
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("ElevenLabs Agent Id")
			.setDesc("ElevenLabs Agent Id")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Agent Id")
					.setValue(this.plugin.settings.agentId)
					.onChange(async (value) => {
						this.plugin.settings.agentId = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
