/**
 * Interface for a class that handles persistence of objects.
 * @interface
 * @template PerisitentObject - The type of object to be saved and loaded.
 */
export default abstract class PersistenceManager<PerisitentObject extends object> {
	/**
	 * Saves the object to a persistence medium.
	 * @param {PerisitentObject} objectSaving - The object to save.
	 * @return {void}
	 */
	public abstract saveObject(objectSaving: PerisitentObject): void;

	/**
	 * Gets the object loaded from a persistence medium.
	 *
	 * @return {PerisitentObject} The loaded object.
	 */
	protected abstract getLoadedObject(): PerisitentObject;

	/**
	 * Loads the object from a persistence medium.
	 * @param objectToLoad - The object to load.
	 * @return The loaded object.
	 */
	public loadObject(objectToLoad: PerisitentObject) {
		Object.assign(objectToLoad, this.getLoadedObject());
	};


}
