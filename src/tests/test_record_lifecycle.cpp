#include "../rms/RecordEnumerationImpl.h"

#include <cassert>

// Run without SDL: c++ -std=c++17 src/tests/test_record_lifecycle.cpp
// src/rms/RecordEnumerationImpl.cpp -o /tmp/test_record_lifecycle
int main()
{
    RecordEnumerationImpl records;
    const int id = records.addRecord({1, 2, 3});
    assert(records.nextRecord() == std::vector<int8_t>({1, 2, 3}));
    records.destroy();

    assert(records.numRecords() == 1);
    records.setRecord(id, {4, 5, 6});
    assert(records.nextRecordId() == id);
    assert(records.nextRecord() == std::vector<int8_t>({4, 5, 6}));
    records.destroy();
    assert(records.nextRecord() == std::vector<int8_t>({4, 5, 6}));
}
