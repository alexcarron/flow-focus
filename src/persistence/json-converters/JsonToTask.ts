import Task from "../../model/Task";
import JsonToObjectConverter from "./JsonToObjectConverter";

export default class JsonToTask implements JsonToObjectConverter<Task> {

/**
 * Converts a JSON object to a Task object.
 *
 * @param {object} jsonObject - The JSON object to convert.
 * @return {Task} The converted Task object.
 * @throws {Error} If the JSON object is missing the required 'description' property or if it is not a string.
 */
	convertJsonToObject(jsonObject: object): Task {
		// Check if jsonObject has description property
		if (
			!('description' in jsonObject) ||
			typeof jsonObject.description !== 'string'
		) {
			throw new Error('Task JSON object is missing string description property');
		}

		const task = new Task(jsonObject.description);

		// Check if jsonObject has deadline property in date format
		if (
			('deadline' in jsonObject) &&
			typeof jsonObject.deadline === 'string'
		) {
			const deadline = new Date(jsonObject.deadline);

			// Check if deadline is a valid date and reasonable time
			if (
				!isNaN(deadline.getTime()) &&
				deadline instanceof Date &&
				deadline.getTime() > Date.now() - 1000 * 60 * 60 * 24 * 365 * 5
			) {
				task.setDeadline(deadline);
			}
		}

		// Check if jsonObject has boolean isMandatory property
		if (
			('isMandatory' in jsonObject) &&
			typeof jsonObject.isMandatory === 'boolean'
		) {
			task.setMandatory(jsonObject.isMandatory);
		}

		// Check if jsonObject has string array steps property
		if (
			'steps' in jsonObject &&
			Array.isArray(jsonObject.steps)
		) {
			// Check if jsonObject.steps array contains only strings
			jsonObject.steps.forEach((step: any) => {
				if (typeof step === 'string') {
					task.addStep(step);
				}
			});
		}

		return task;
	}
}
