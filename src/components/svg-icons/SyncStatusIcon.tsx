import { SyncStatusIndicatorState } from '../../hooks/useSyncStatusIndicator';
import SyncedIcon from './SyncedIcon';
import SyncingIcon from './SyncingIcon';
import OfflineIcon from './OfflineIcon';
import UnsyncedIcon from './UnsyncedIcon';
import styles from './SyncStatusIcon.module.css';

interface Props {
	state: SyncStatusIndicatorState;
	className?: string;
}

const stateToIconComponent: Record<SyncStatusIndicatorState, (props: { className?: string }) => JSX.Element> = {
	synced: SyncedIcon,
	syncing: SyncingIcon,
	offline: OfflineIcon,
	unsynced: UnsyncedIcon,
};

export default function SyncStatusIcon({ state, className = '' }: Props) {
	const IconComponent = stateToIconComponent[state];
	const spinningClassName = state === 'syncing' ? styles.spinning : '';

	return <IconComponent className={`${styles.icon} ${styles[state]} ${spinningClassName} ${className}`} />;
}
