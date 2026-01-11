
import { assets } from '../assets/assets';
import MedicalChatBot from '../components/MedicalChatBot';

const About = () => {
  return (
    <div className="bg-gray-50 py-16">
      {/* Header Section */}
      <div className="text-center text-4xl font-extrabold text-gray-900">
        <p>ABOUT <span className="text-blue-600">US</span></p>
        <p className="text-lg text-gray-600 mt-4">Bridging Healthcare with Technology</p>
      </div>

      {/* Content Section */}
      <div className="flex flex-col lg:flex-row items-center justify-between max-w-screen-xl mx-auto mt-12 px-4">
        {/* Left Image */}
        <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
          <img src={assets.about_image} alt="About MediConnect" className="w-3/4 h-auto object-cover rounded-lg shadow-xl mx-auto lg:mx-0" />
        </div>

        {/* Right Text Content */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <p className="text-xl text-gray-700 mb-6">
            Welcome to <span className="font-semibold text-blue-600">MediConnect</span>, the future of healthcare. We’re committed to improving access to healthcare services by providing an easy-to-use platform for patients to find and book appointments with trusted doctors.
          </p>

          <p className="text-xl text-gray-700 mb-4 font-semibold">Our Vision</p>
          <p className="text-lg text-gray-600">
            Our vision is to create a world where healthcare is accessible, affordable, and convenient for everyone. MediConnect is dedicated to making healthcare appointments simple and hassle-free, enabling patients to make informed decisions and access the care they deserve without delay.
          </p>

          <p className="text-xl text-gray-700 mt-6 font-semibold">Why MediConnect?</p>
          <ul className="text-lg text-gray-600 list-disc pl-5 mt-4">
            <li>Instant access to verified doctors and specialists</li>
            <li>Flexible booking times, including virtual consultations</li>
            <li>Seamless experience across web and mobile platforms</li>
            <li>End-to-end privacy and security for all user data</li>
          </ul>
        </div>
        <MedicalChatBot/>
      </div>
    </div>
  );
};

export default About;
