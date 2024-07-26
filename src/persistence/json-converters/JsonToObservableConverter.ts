import StateObserver from "../peristent-objects/StateObserver";

/**
 * An interface for converting a JSON object into an instance of a class with a state observer and vice versa.
 *
 * @template ObjectCreating - The type of object created from the JSON object.
 */
export default interface JsonSerializer<ObjectCreating> {
  /**
   * Converts a JSON object into an instance of the class.
   *
   * @param {object} jsonObject - The JSON object to convert.
	 * @param {StateObserver} stateObserver - The state observer to use.
   * @return {ObjectCreating} The instance of the class created from the JSON object.
   */
  convertJsonToObject(jsonObject: object, stateObserver: StateObserver): ObjectCreating;

	/**
	 * Converts an instance of the class into a JSON object.
	 *
	 * @param {ObjectCreating} object - The instance of the class to convert.
	 * @return {object} The JSON object created from the instance of the class.
	 */
	convertObjectToJson(object: ObjectCreating): object;
}
