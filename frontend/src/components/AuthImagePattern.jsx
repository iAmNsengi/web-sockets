import PropTypes from "prop-types";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex items-center justify-center bg-primary/10 p-12">
      <div className="max-w-md text-center">
        <div className="grid grid-cols-3 gap-3 mb-8 ">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`size-24 rounded-2xl bg-primary/50 ${
                i % 2 === 0 ? "animate-bounce" : "animate-pulse"
              } ${i === 4 ? "animate-ping" : ""}`}
            ></div>
          ))}
        </div>
        <h2 className="text-2xl font-bold-mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle} </p>
      </div>
    </div>
  );
};
AuthImagePattern.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

export default AuthImagePattern;
