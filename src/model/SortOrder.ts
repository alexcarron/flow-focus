enum SortOrder {
	FIRST_BEFORE_SECOND = -1, // Indicates the first item comes before the second
	FIRST_EQUAL_SECOND = 0,    // Indicates both items are equal
	SECOND_BEFORE_FIRST = 1,    // Indicates the first item comes after the second
	UNDETERMINED = 0, // Indicates the order of items is undetermined so far
}

export default SortOrder;