import { CiShoppingCart } from 'react-icons/ci';

const CartNavbar = ({ toggleCart, totalItem }) => {
  return (
    <button
      type="button"
      onClick={toggleCart}
      className="flex gap-1 items-center font-semibold group cursor-pointer"
    >
      <span className="hidden sm:inline">
        <CiShoppingCart size={25} />
      </span>{' '}
      <span>({totalItem})</span>
      <span className="w-3 h-3 bg-yellow border-2 border-black rounded-full group-hover:w-5 group-hover:h-5 transition-all duration-1000"></span>
    </button>
  );
};

export default CartNavbar;
