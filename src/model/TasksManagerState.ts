import TaskState from "./task/TaskState"
import RecurringDateRange from "./time-management/RecurringDateRange"
import TimeWindow from "./time-management/TimeWindow"

type TasksManagerState = {
	tasks: TaskState[],
	asleepTimeWindow: TimeWindow
	downtimeTime: RecurringDateRange
}

export default TasksManagerState