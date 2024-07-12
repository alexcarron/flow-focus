import StateObserver from "../peristent-objects/StateObserver";

/**
 * Interface for a class that handles persistence of objects.
 * @interface
 * @template PersistentObject - The type of object to be saved and loaded.
 */
export default abstract class PersistenceManager<PersistentObject extends object> implements StateObserver {
	protected persistentObject: PersistentObject | null = null;

	public getPersistentObject() {return this.persistentObject}
	public setPersistentObject(persistentObject: PersistentObject) {
		this.persistentObject = persistentObject;
	}


	/**
	 * Called when the state of the persistent object changes.
	 */
	public onStateChange() {
		this.saveObject();
	}

	private isLoaded(): boolean {
		return this.persistentObject !== null;
	}

	/**
	 * Saves the persistent object to a persistence medium.
	 */
	protected abstract saveNonNullObject(): Promise<void>;

	/**
	 * Saves the persistent object to a persistence medium if it is not null.
	 */
	public async saveObject(): Promise<void> {
		if (this.isLoaded()) {
			return await this.saveNonNullObject();
		}
	}

	/**
	 * Gets the object loaded from a persistence medium.
	 *
	 * @return {PersistentObject} The loaded object.
	 */
	protected abstract getLoadedObject(): Promise<PersistentObject>;

	/**
	 * Loads the object from a persistence medium.
	 * @param objectToLoad - The object to load.
	 * @return The loaded object.
	 */
	public async loadObject(): Promise<void> {
		const loadedObject = await this.getLoadedObject();
		if (this.isLoaded()) {
			Object.assign(this.persistentObject!, loadedObject);
		}
		else {
			this.persistentObject = loadedObject;
		}
	};


}
