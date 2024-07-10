/**
 * An interface for converting a JSON object into an instance of a class.
 *
 * @template ObjectCreating - The type of object created from the JSON object.
 */
export default interface JsonToObjectConverter<ObjectCreating> {
  /**
   * Converts a JSON object into an instance of the class.
   *
   * @param {object} jsonObject - The JSON object to convert.
   * @return {ObjectCreating} The instance of the class created from the JSON object.
   */
  convertJsonToObject(jsonObject: object): ObjectCreating;
}
