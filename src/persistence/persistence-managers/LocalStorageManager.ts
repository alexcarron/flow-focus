import JsonObservableConverter from "../json-converters/JsonToObservableConverter";
import PersistenceManager from "./PersistenceManager";

/**
 * A class for saving and loading objects to and from local storage.
 *
 * @template PersistentObject - The type of object to be saved and loaded.
 */
export default class LocalStorageManager<PersistentObject extends object> extends PersistenceManager<PersistentObject> {
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
	private jsonToObjectConverter: JsonObservableConverter<PersistentObject>;

	/**
	 * Creates a new LocalStorage object.
	 *
	 * @param {string} localStorage - The browser local storage object.
	 * @param {string} localStorageKey - The name of the key used to store the object in local storage.
	 * @param {JsonObservableConverter<PersistentObject>} jsonToObjectConverter - The converter used to convert the object to and from JSON.
	 */
	constructor(
		localStorage: Storage,
		localStorageKey: string,
		jsonToObjectConverter: JsonObservableConverter<PersistentObject>
	) {
		super();
		this.localStorage = localStorage;
		this.localStorageKey = localStorageKey;
		this.jsonToObjectConverter = jsonToObjectConverter;
	}

	/**
	 * Saves the object to local storage.
	 */
	saveNonNullObject(): Promise<void> {
		return Promise.resolve(
			this.localStorage.setItem(
				this.localStorageKey,
				JSON.stringify(this.persistentObject)
			)
		);
	}

	/**
	 * Loads the object from local storage.
	 *
	 * @return {PersistentObject} The loaded object.
	 * @throws {Error} If the object cannot be loaded from local storage.
	 */
	getLoadedObject(): Promise<PersistentObject> {
		const jsonString = this.localStorage.getItem(this.localStorageKey);

		if (jsonString) {
			const jsonObject = JSON.parse(jsonString);
			const persistentObject = this.jsonToObjectConverter.convertJsonToObject(jsonObject);
			return Promise.resolve(persistentObject);
		}

		throw new Error('Failed to load object from local storage');
	}
}
