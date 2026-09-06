import QuickToDoChecklistSection from '../QuickToDoChecklistSection';
import styles from './QuickToDoPage.module.css';

export default function QuickToDoPage() {
	return (
		<div className={styles.page}>
			<QuickToDoChecklistSection />
		</div>
	);
}
