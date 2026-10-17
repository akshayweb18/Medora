/**
 * Edit Medicine — re-uses the AddMedicine screen with the medicine id.
 */
import AddMedicineScreen from '../add';

export default function EditMedicineScreen() {
  // The add screen reads `id` from params to know it's in edit mode
  return <AddMedicineScreen />;
}
