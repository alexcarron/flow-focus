export default interface Clonable<TypeCloning extends Clonable<TypeCloning>> {
	getClone(): TypeCloning;
}