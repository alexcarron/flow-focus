import JsonSerializer from "../json-converters/JsonToObservableConverter";
import PersistenceManager from "./PersistenceManager";

export default class JsonBinServer<PersistentObject extends object> extends PersistenceManager<PersistentObject> {
	private static readonly SAVE_COOLDOWN_TIME = 1 * 60 * 1000; // 1 minute in milliseconds
	private static readonly BASE_URL = `https://api.jsonbin.io/v3/b`;

	private lastSaveTime: number | null = null;
	private isSavePending: boolean = false;
	private binVersion: string = 'latest';

	constructor(
		private readonly apiKey: string,
		private readonly binId: string,
		private jsonToObjectConverter: JsonSerializer<PersistentObject>,
	) {
		super();
	}

	public setBinVersion(binVersion: string) {
		this.binVersion = binVersion;
	}

	private getSaveURL(): string {
		return `${JsonBinServer.BASE_URL}/${this.binId}`;
	}

	private getLoadURL(): string {
		return `${this.getSaveURL()}/${this.binVersion}`;
	}

	private isCooldownOver(lastOperationTime: number | null): boolean {
		if (lastOperationTime === null) {
				return true;
		}

		const currentTime = Date.now();
		return currentTime - lastOperationTime >= JsonBinServer.SAVE_COOLDOWN_TIME;
	}

	private queueSave(): void {
			if (!this.isSavePending) {
					this.isSavePending = true;

					const timeUntilCooldownEnds = JsonBinServer.SAVE_COOLDOWN_TIME - (Date.now() - (this.lastSaveTime ?? 0));
					setTimeout(async () => {
							this.isSavePending = false;
							await this.saveNonNullObject();
					}, timeUntilCooldownEnds);
			}
	}

	protected override async saveNonNullObject(): Promise<void> {
		if (!this.isCooldownOver(this.lastSaveTime)) {
			this.queueSave();
			console.log('Cooldown period is still active. Please wait before saving again.');
			return;
		}

		this.lastSaveTime = Date.now(); // Update the last save time
		console.log("Saving...");

		const saveUrl = this.getSaveURL();
		const persistentObjectJson = this.jsonToObjectConverter.convertObjectToJson(this.getPersistentObject()!);



		const response = await fetch(saveUrl, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'X-Master-Key': this.apiKey,
				'X-Bin-Meta': 'false'
			},
			body: JSON.stringify(persistentObjectJson)
		});


		if (response.status !== 200) {
			throw new Error(`Error: ${response.status} ${response.statusText}`);
		}
	}

	protected override async getLoadedObject(): Promise<PersistentObject> {
		console.log("Loading...");

		const loadURL = this.getLoadURL();

		const response = await fetch(loadURL, {
			method: 'GET',
			headers: {
				'X-Master-Key': this.apiKey,
				'X-Bin-Meta': 'false' // Optional, to exclude metadata
			}
		});

		if (!response.ok) {
			throw new Error(`Error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		this.persistentObject = this.jsonToObjectConverter.convertJsonToObject(data, this);

		return this.persistentObject;
	}
}