/**
 * Interface for a class that handles persistence of objects.
 * @interface
 * @template PersistentObject - The type of object to be saved and loaded.
 */
export default abstract class PersistenceManager<PersistentObject extends object> {
	/**
	 * Saves the object to a persistence medium.
	 * @param {PersistentObject} objectSaving - The object to save.
	 * @return {void}
	 */
	public abstract saveObject(objectSaving: PersistentObject): void;

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
	public async loadObject(objectToLoad: PersistentObject) {
    const loadedObject = await this.getLoadedObject();
    Object.assign(objectToLoad, loadedObject);
	};


}
