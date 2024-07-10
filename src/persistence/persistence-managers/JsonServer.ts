import { HttpClient } from "@angular/common/http";
import PersistenceManager from "./PersistenceManager";
import { lastValueFrom } from "rxjs";
import JsonToObjectConverter from "../json-converters/JsonToObjectConverter";

export default class JsonServer<PersistentObject extends object> extends PersistenceManager<PersistentObject> {
	constructor(
		private apiURL: string,
		private httpClient: HttpClient,
		private jsonToObjectConverter: JsonToObjectConverter<PersistentObject>
	) {
		super();
	}

	public async saveObject(objectSaving: PersistentObject) {
		await lastValueFrom(this.httpClient.put(this.apiURL, objectSaving));
	}

	protected async getLoadedObject(): Promise<PersistentObject> {
		const loadedJsonObject = await lastValueFrom(this.httpClient.get<object>(this.apiURL));
		const loadedObject = this.jsonToObjectConverter.convertJsonToObject(loadedJsonObject);
		return loadedObject;
	}

}