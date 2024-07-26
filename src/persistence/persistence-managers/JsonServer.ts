import { HttpClient } from "@angular/common/http";
import PersistenceManager from "./PersistenceManager";
import { lastValueFrom } from "rxjs";
import JsonSerializer from "../json-converters/JsonToObservableConverter";

export default class JsonServer<PersistentObject extends object> extends PersistenceManager<PersistentObject> {
	constructor(
		private apiURL: string,
		private httpClient: HttpClient,
		private jsonToObjectConverter: JsonSerializer<PersistentObject>
	) {
		super();
	}

	/**
	 * Saves the object to the json server.
	 */
	public async saveNonNullObject(): Promise<void> {
		const jsonObject = this.jsonToObjectConverter.convertObjectToJson(this.persistentObject!);
		await lastValueFrom(this.httpClient.put(this.apiURL, jsonObject));
	}

	/**
	 * Loads the object from the json server.
	 *
	 * @return {PersistentObject} The loaded object.
	 */
	protected async getLoadedObject(): Promise<PersistentObject> {
		const loadedJsonObject = await lastValueFrom(this.httpClient.get<object>(this.apiURL));

		const loadedObject = this.jsonToObjectConverter.convertJsonToObject(loadedJsonObject, this);

		return loadedObject;
	}

}