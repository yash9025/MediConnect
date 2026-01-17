import Header from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'
import { MedicalChatBot } from '../features/rag'
const Home = () => {
  
  return (
    <div>
      <Header />
      <SpecialityMenu />
      <TopDoctors />
      <Banner/>
      <MedicalChatBot/>
    </div>
  )
}

export default Home
