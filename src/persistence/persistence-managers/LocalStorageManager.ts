import JsonToObjectConverter from "../json-converters/JsonToObjectConverter";
import PersistenceManager from "./PersistenceManager";

/**
 * A class for saving and loading objects to and from local storage.
 *
 * @template PerisitentObject - The type of object to be saved and loaded.
 */
export default class LocalStorageManager<PerisitentObject extends object> extends PersistenceManager<PerisitentObject> {
	/**
	 * The browser local storage object.
	 */
	private localStorage: Storage;

	/**
	 * The name of the key used to store the object in local storage.
	 */
	private localStorageKey: string;

	/**
	 * The converter used to convert the object to and from JSON.
	 */
	private jsonToObjectConverter: JsonToObjectConverter<PerisitentObject>;

	/**
	 * Creates a new LocalStorage object.
	 *
	 * @param {string} localStorage - The browser local storage object.
	 * @param {string} localStorageKey - The name of the key used to store the object in local storage.
	 * @param {JsonToObjectConverter<PerisitentObject>} jsonToObjectConverter - The converter used to convert the object to and from JSON.
	 */
	constructor(
		localStorage: Storage,
		localStorageKey: string,
		jsonToObjectConverter: JsonToObjectConverter<PerisitentObject>
	) {
		super();
		this.localStorage = localStorage;
		this.localStorageKey = localStorageKey;
		this.jsonToObjectConverter = jsonToObjectConverter;
	}

	/**
	 * Saves the object to local storage.
	 *
	 * @param {PerisitentObject} obj - The object to save.
	 */
	saveObject(obj: PerisitentObject): void {
		this.localStorage.setItem(this.localStorageKey, JSON.stringify(obj));
	}

	/**
	 * Loads the object from local storage.
	 *
	 * @return {PerisitentObject} The loaded object.
	 * @throws {Error} If the object cannot be loaded from local storage.
	 */
	getLoadedObject(): PerisitentObject {
		const jsonString = this.localStorage.getItem(this.localStorageKey);

		if (jsonString) {
			const jsonObject = JSON.parse(jsonString);
			const persistentObject = this.jsonToObjectConverter.convertJsonToObject(jsonObject);
			return persistentObject;
		}

		throw new Error('Failed to load object from local storage');
	}
}
