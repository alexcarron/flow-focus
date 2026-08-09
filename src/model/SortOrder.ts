// Comparator return values: negative sorts first, positive sorts last, zero leaves order unchanged.
enum SortOrder {
	FIRST_BEFORE_SECOND = -1,
	FIRST_EQUAL_SECOND = 0,
	SECOND_BEFORE_FIRST = 1,
	UNDETERMINED = 0,
}

export default SortOrder;
